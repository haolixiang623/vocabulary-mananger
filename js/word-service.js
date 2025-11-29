// 单词管理服务
// 使用全局对象而不是import语句
// 直接使用window.supabaseClient，避免重复声明

const tagService = window.tagService || {};

let currentEditingWordId = null;
let selectedTagIds = new Set(); // 用于搜索的选中标签
let currentWords = []; // 当前显示的单词列表
let selectedWordIds = new Set(); // 批量操作选中的单词ID

// 获取所有单词（包含标签）
async function getWords() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 获取用户的所有单词
        const { data: words, error: wordsError } = await window.supabaseClient
            .from('words')
            .select('*')
            .eq('user_id', user.id)
            .order('id', { ascending: true });

        if (wordsError) throw wordsError;

        // 获取所有标签
        const { data: tags, error: tagsError } = await window.supabaseClient
            .from('tags')
            .select('*')
            .eq('user_id', user.id);

        if (tagsError) throw tagsError;

        // 为了符合RLS策略，我们将通过用户的单词来批量获取对应的word_tags
        // 由于我们已经有了用户的单词列表，我们可以直接构建单词ID到标签的映射
        // 使用单个查询获取所有相关的word_tags，通过RLS策略自动过滤用户的数据
        const { data: wordTags, error: wordTagsError } = await window.supabaseClient
            .from('word_tags')
            .select('*');

        if (wordTagsError) throw wordTagsError;

        // 创建标签映射
        const tagMap = new Map();
        tags.forEach(tag => {
            tagMap.set(tag.tag_id, tag.tag_name);
        });

        // 为每个单词添加标签信息
        const wordsWithTags = words.map(word => {
            const wordTagIds = wordTags
                .filter(wt => wt.word_id === word.id)
                .map(wt => wt.tag_id);

            const wordTagsList = wordTagIds
                .map(tagId => tagMap.get(tagId))
                .filter(name => name);

            return {
                ...word,
                tags: wordTagsList,
                tagIds: wordTagIds
            };
        });

        currentWords = wordsWithTags;
        return wordsWithTags;
    } catch (error) {
        console.error('Get words error:', error);
        window.authUtils.showToast?.('获取单词列表失败', 'error');
        return [];
    }
}

// 显示单词列表
function displayWords(words) {
    const tbody = document.getElementById('wordTableBody');
    const emptyState = document.getElementById('emptyState');
    const wordCount = document.getElementById('wordCount');
    const thead = document.querySelector('#wordTable thead tr');

    if (!tbody) return;

    // 更新表头，添加全选复选框
    if (thead && !thead.querySelector('.checkbox-col')) {
        const th = document.createElement('th');
        th.className = 'checkbox-col';
        th.innerHTML = '<input type="checkbox" id="selectAllCheckbox">';
        thead.insertBefore(th, thead.firstChild);

        // 绑定全选事件
        const selectAll = document.getElementById('selectAllCheckbox');
        selectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.word-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const wordId = parseInt(cb.value);
                if (e.target.checked) {
                    selectedWordIds.add(wordId);
                } else {
                    selectedWordIds.delete(wordId);
                }
            });
            updateBatchToolbar();
        });
    }

    tbody.innerHTML = '';
    selectedWordIds.clear(); // 重置选择
    updateBatchToolbar();

    // 重置全选框
    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) selectAll.checked = false;

    if (words.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (wordCount) wordCount.textContent = '共 0 个单词';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (wordCount) wordCount.textContent = `共 ${words.length} 个单词`;

    words.forEach(word => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" class="word-checkbox" value="${word.id}">
            </td>
            <td>${word.id}</td>
            <td>${escapeHtml(word.word)}</td>
            <td>${escapeHtml(word.meaning)}</td>
            <td>
                <div class="tag-list">
                    ${word.tags.map(tag => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </td>
            <td>${word.review1 || ''}</td>
            <td>${word.review2 || ''}</td>
            <td>${word.review3 || ''}</td>
            <td>${word.review4 || ''}</td>
            <td>${word.review5 || ''}</td>
            <td>${word.review6 || ''}</td>
            <td>
                <button class="btn btn-primary btn-small edit-word-btn" data-word-id="${word.id}">编辑</button>
                <button class="btn btn-danger btn-small delete-word-btn" data-word-id="${word.id}">删除</button>
            </td>
`;
        tbody.appendChild(tr);
    });

    // 绑定复选框事件
    document.querySelectorAll('.word-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const wordId = parseInt(e.target.value);
            if (e.target.checked) {
                selectedWordIds.add(wordId);
            } else {
                selectedWordIds.delete(wordId);
            }
            updateBatchToolbar();

            // 更新全选框状态
            const allChecked = Array.from(document.querySelectorAll('.word-checkbox')).every(c => c.checked);
            if (selectAll) selectAll.checked = allChecked;
        });
    });

    // 绑定编辑按钮事件
    document.querySelectorAll('.edit-word-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wordId = parseInt(e.target.dataset.wordId);
            openEditWordModal(wordId);
        });
    });

    // 绑定删除按钮事件
    document.querySelectorAll('.delete-word-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wordId = parseInt(e.target.dataset.wordId);
            deleteWord(wordId);
        });
    });
}

// 更新批量工具栏状态
function updateBatchToolbar() {
    const toolbar = document.getElementById('batchToolbar');
    const countSpan = document.getElementById('selectedCount');

    if (toolbar && countSpan) {
        countSpan.textContent = selectedWordIds.size;
        if (selectedWordIds.size > 0) {
            toolbar.classList.remove('hidden');
        } else {
            toolbar.classList.add('hidden');
        }
    }
}

// 批量删除
async function batchDelete() {
    if (selectedWordIds.size === 0) return;

    const confirmed = await window.authUtils.showConfirm(`确定要删除选中的 ${selectedWordIds.size} 个单词吗？`, '批量删除确认');
    if (!confirmed) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        const ids = Array.from(selectedWordIds);
        const { error } = await window.supabaseClient
            .from('words')
            .delete()
            .in('id', ids)
            .eq('user_id', user.id);

        if (error) throw error;

        window.authUtils.showToast?.('批量删除成功', 'success');
        await loadWordList();
    } catch (error) {
        console.error('Batch delete error:', error);
        window.authUtils.showToast?.('批量删除失败: ' + error.message, 'error');
    }
}

// 批量更新标签
async function batchUpdateTags(tagIds, action) {
    if (selectedWordIds.size === 0) return;
    if (tagIds.length === 0) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        const wordIds = Array.from(selectedWordIds);

        if (action === 'add') {
            // 准备插入数据
            const inserts = [];
            for (const wordId of wordIds) {
                for (const tagId of tagIds) {
                    inserts.push({ word_id: wordId, tag_id: tagId });
                }
            }

            // 批量插入（忽略冲突）
            const { error } = await window.supabaseClient
                .from('word_tags')
                .upsert(inserts, { onConflict: 'word_id, tag_id', ignoreDuplicates: true });

            if (error) throw error;
        } else if (action === 'remove') {
            // 批量删除
            const { error } = await window.supabaseClient
                .from('word_tags')
                .delete()
                .in('word_id', wordIds)
                .in('tag_id', tagIds);

            if (error) throw error;
        }

        window.authUtils.showToast?.('批量更新标签成功', 'success');
        await loadWordList();
        window.authUtils.hideModal('batchTagsModal');
    } catch (error) {
        console.error('Batch update tags error:', error);
        window.authUtils.showToast?.('批量更新标签失败: ' + error.message, 'error');
    }
}

// 批量更新复习状态
async function batchUpdateReviews(reviewData) {
    if (selectedWordIds.size === 0) return;

    // 过滤掉空值（不修改的项）
    const updates = {};
    Object.keys(reviewData).forEach(key => {
        if (reviewData[key] !== '') {
            updates[key] = reviewData[key] === 'empty' ? '' : reviewData[key];
        }
    });

    if (Object.keys(updates).length === 0) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        const ids = Array.from(selectedWordIds);
        const { error } = await window.supabaseClient
            .from('words')
            .update(updates)
            .in('id', ids)
            .eq('user_id', user.id);

        if (error) throw error;

        window.authUtils.showToast?.('批量更新状态成功', 'success');
        await loadWordList();
        window.authUtils.hideModal('batchEditModal');
    } catch (error) {
        console.error('Batch update reviews error:', error);
        window.authUtils.showToast?.('批量更新状态失败: ' + error.message, 'error');
    }
}

// 打开添加单词模态框
function openAddWordModal() {
    currentEditingWordId = null;
    const modal = document.getElementById('wordModal');
    const title = document.getElementById('wordModalTitle');
    const form = document.getElementById('wordForm');
    const reviewSection = document.getElementById('reviewSection');

    if (title) title.textContent = '添加单词';
    if (form) form.reset();
    if (reviewSection) reviewSection.classList.add('hidden');

    loadTagCheckboxes();
    window.authUtils.showModal('wordModal');
}

// 打开编辑单词模态框
async function openEditWordModal(wordId) {
    currentEditingWordId = wordId;
    const modal = document.getElementById('wordModal');
    const title = document.getElementById('wordModalTitle');
    const form = document.getElementById('wordForm');
    const reviewSection = document.getElementById('reviewSection');

    if (title) title.textContent = '编辑单词';

    // 获取单词数据
    const words = await getWords();
    const word = words.find(w => w.id === wordId);

    if (!word) {
        window.authUtils.showToast?.('单词不存在', 'error');
        return;
    }

    // 填充表单
    const wordInput = document.getElementById('wordInput');
    const meaningInput = document.getElementById('meaningInput');

    if (wordInput) wordInput.value = word.word;
    if (meaningInput) meaningInput.value = word.meaning;

    // 填充复习记录
    for (let i = 1; i <= 6; i++) {
        const reviewSelect = document.getElementById(`review${i} `);
        if (reviewSelect) {
            reviewSelect.value = word[`review${i} `] || '';
        }
    }

    if (reviewSection) reviewSection.classList.remove('hidden');

    // 加载标签复选框（选中当前单词的标签）
    loadTagCheckboxes(wordId);

    window.authUtils.showModal('wordModal');
}

// 加载标签复选框
async function loadTagCheckboxes(selectedWordId = null) {
    const container = document.getElementById('tagCheckboxes');
    if (!container) return;

    container.innerHTML = '';

    const tags = await window.tagService.getTags?.() || [];
    let selectedTagIds = new Set();

    // 如果编辑单词，获取已选中的标签
    if (selectedWordId) {
        const words = await getWords();
        const word = words.find(w => w.id === selectedWordId);
        if (word && word.tagIds) {
            selectedTagIds = new Set(word.tagIds);
        }
    }

    tags.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'tag-checkbox-item';
        div.innerHTML = `
    < input type = "checkbox" id = "tag_${tag.tag_id}" value = "${tag.tag_id}" ${selectedTagIds.has(tag.tag_id) ? 'checked' : ''}>
        <label for="tag_${tag.tag_id}">${escapeHtml(tag.tag_name)}</label>
`;
        container.appendChild(div);
    });
}

// 添加单词
async function addWord(wordData) {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 插入单词
        const { data: word, error: wordError } = await window.supabaseClient
            .from('words')
            .insert({
                user_id: user.id,
                word: wordData.word.trim(),
                meaning: wordData.meaning.trim(),
                review1: wordData.review1 || '',
                review2: wordData.review2 || '',
                review3: wordData.review3 || '',
                review4: wordData.review4 || '',
                review5: wordData.review5 || '',
                review6: wordData.review6 || ''
            })
            .select()
            .single();

        if (wordError) throw wordError;

        // 插入标签关联
        if (wordData.tagIds && wordData.tagIds.length > 0) {
            const wordTagInserts = wordData.tagIds.map(tagId => ({
                word_id: word.id,
                tag_id: tagId
            }));

            // 插入标签关联，RLS策略会自动通过word_id关联检查权限
            const { error: wordTagsError } = await window.supabaseClient
                .from('word_tags')
                .insert(wordTagInserts);

            if (wordTagsError) throw wordTagsError;
        }

        window.authUtils.showToast?.('单词添加成功', 'success');
        return { success: true, word };
    } catch (error) {
        console.error('Add word error:', error);
        window.authUtils.showToast?.(error.message || '添加单词失败', 'error');
        return { success: false, error };
    }
}

// 更新单词
async function updateWord(wordId, wordData) {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 更新单词
        const { error: wordError } = await window.supabaseClient
            .from('words')
            .update({
                word: wordData.word.trim(),
                meaning: wordData.meaning.trim(),
                review1: wordData.review1 || '',
                review2: wordData.review2 || '',
                review3: wordData.review3 || '',
                review4: wordData.review4 || '',
                review5: wordData.review5 || '',
                review6: wordData.review6 || ''
            })
            .eq('id', wordId)
            .eq('user_id', user.id);

        if (wordError) throw wordError;

        // 删除旧的标签关联，RLS策略会自动通过word_id关联检查权限
        const { error: deleteError } = await window.supabaseClient
            .from('word_tags')
            .delete()
            .eq('word_id', wordId);

        if (deleteError) throw deleteError;

        // 插入新的标签关联，RLS策略会自动通过word_id关联检查权限
        if (wordData.tagIds && wordData.tagIds.length > 0) {
            const wordTagInserts = wordData.tagIds.map(tagId => ({
                word_id: wordId,
                tag_id: tagId
            }));

            const { error: wordTagsError } = await window.supabaseClient
                .from('word_tags')
                .insert(wordTagInserts);

            if (wordTagsError) throw wordTagsError;
        }

        window.authUtils.showToast?.('单词更新成功', 'success');
        return { success: true };
    } catch (error) {
        console.error('Update word error:', error);
        window.authUtils.showToast?.(error.message || '更新单词失败', 'error');
        return { success: false, error };
    }
}

// 删除单词
async function deleteWord(wordId) {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        const confirmed = await window.authUtils.showConfirm('确定要删除这个单词吗？', '删除确认');
        if (!confirmed) {
            return { success: false, cancelled: true };
        }

        // 删除单词（关联关系会通过CASCADE自动删除）
        const { error } = await window.supabaseClient
            .from('words')
            .delete()
            .eq('id', wordId)
            .eq('user_id', user.id);

        if (error) throw error;

        // 刷新单词列表
        const updatedWords = await getWords();
        displayWords(updatedWords);

        window.authUtils.showToast?.('单词删除成功', 'success');
        return { success: true };
    } catch (error) {
        console.error('Delete word error:', error);
        window.authUtils.showToast?.(error.message || '删除单词失败', 'error');
        return { success: false, error };
    }
}

// 搜索单词（按标签）
async function searchWordsByTags(tagIds) {
    if (!tagIds || tagIds.length === 0) {
        return await getWords();
    }

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 获取包含所有选中标签的单词ID
        // 使用子查询找到同时包含所有标签的单词
        const { data: wordTags, error } = await window.supabaseClient
            .from('word_tags')
            .select('word_id, tag_id')
            .in('tag_id', tagIds);

        if (error) throw error;

        // 统计每个单词包含的标签数量
        const wordTagCounts = new Map();
        wordTags.forEach(wt => {
            const count = wordTagCounts.get(wt.word_id) || 0;
            wordTagCounts.set(wt.word_id, count + 1);
        });

        // 找到包含所有标签的单词ID
        const matchingWordIds = Array.from(wordTagCounts.entries())
            .filter(([wordId, count]) => count === tagIds.length)
            .map(([wordId]) => wordId);

        if (matchingWordIds.length === 0) {
            return [];
        }

        // 获取这些单词的完整信息
        const allWords = await getWords();
        return allWords.filter(word => matchingWordIds.includes(word.id));
    } catch (error) {
        console.error('Search words error:', error);
        window.authUtils.showToast?.('搜索失败', 'error');
        return [];
    }
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 绑定单词相关事件
function bindWordEvents() {
    // 添加单词按钮
    const addWordBtn = document.getElementById('addWordBtn');
    if (addWordBtn) {
        addWordBtn.addEventListener('click', () => {
            openAddWordModal();
        });
    }

    // 单词表单提交
    const wordForm = document.getElementById('wordForm');
    if (wordForm) {
        wordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const wordInput = document.getElementById('wordInput');
            const meaningInput = document.getElementById('meaningInput');

            if (!wordInput || !meaningInput) return;

            const word = wordInput.value.trim();
            const meaning = meaningInput.value.trim();

            if (!word || !meaning) {
                window.authUtils.showToast?.('请填写单词和中文释义', 'error');
                return;
            }

            // 获取选中的标签
            const checkedTags = Array.from(document.querySelectorAll('#tagCheckboxes input[type="checkbox"]:checked'))
                .map(cb => parseInt(cb.value));

            // 获取复习记录
            const reviewData = {};
            for (let i = 1; i <= 6; i++) {
                const reviewSelect = document.getElementById(`review${i} `);
                if (reviewSelect) {
                    reviewData[`review${i} `] = reviewSelect.value || '';
                }
            }

            const wordData = {
                word,
                meaning,
                tagIds: checkedTags,
                ...reviewData
            };

            let result;
            if (currentEditingWordId) {
                result = await updateWord(currentEditingWordId, wordData);
            } else {
                result = await addWord(wordData);
            }

            if (result.success) {
                window.authUtils.hideModal('wordModal');
                await loadWordList();
            }
        });
    }

    // 取消按钮
    const cancelWordBtn = document.getElementById('cancelWordBtn');
    if (cancelWordBtn) {
        cancelWordBtn.addEventListener('click', () => {
            window.authUtils.hideModal('wordModal');
        });
    }

    // 新标签输入（回车添加）
    const newTagInput = document.getElementById('newTagInput');
    if (newTagInput) {
        newTagInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tagName = newTagInput.value.trim();
                if (!tagName) {
                    // 这里需要导入tag-service的createTag函数
                    // 暂时先提示用户使用标签管理功能
                    window.authUtils.showToast?.('请使用"管理标签"功能添加新标签', 'info');
                }
            }
        });
    }

    // 排序控制
    const sortOrder = document.getElementById('sortOrder');
    if (sortOrder) {
        sortOrder.addEventListener('change', async () => {
            await loadWordList();
        });
    }

    // 批量操作按钮
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', batchDelete);
    }

    const batchTagsBtn = document.getElementById('batchTagsBtn');
    if (batchTagsBtn) {
        batchTagsBtn.addEventListener('click', async () => {
            // 加载标签复选框
            const container = document.getElementById('batchTagCheckboxes');
            if (container) {
                container.innerHTML = '';
                const tags = await window.tagService.getTags?.() || [];
                tags.forEach(tag => {
                    const div = document.createElement('div');
                    div.className = 'tag-checkbox-item';
                    div.innerHTML = `
    < input type = "checkbox" id = "batch_tag_${tag.tag_id}" value = "${tag.tag_id}" >
        <label for="batch_tag_${tag.tag_id}">${escapeHtml(tag.tag_name)}</label>
`;
                    container.appendChild(div);
                });
            }
            window.authUtils.showModal('batchTagsModal');
        });
    }

    const batchEditBtn = document.getElementById('batchEditBtn');
    if (batchEditBtn) {
        batchEditBtn.addEventListener('click', () => {
            // 重置选择
            for (let i = 1; i <= 6; i++) {
                const select = document.getElementById(`batchReview${i} `);
                if (select) select.value = '';
            }
            window.authUtils.showModal('batchEditModal');
        });
    }

    // 批量操作模态框按钮
    const confirmBatchTagsBtn = document.getElementById('confirmBatchTagsBtn');
    if (confirmBatchTagsBtn) {
        confirmBatchTagsBtn.addEventListener('click', () => {
            const action = document.querySelector('input[name="tagAction"]:checked').value;
            const tagIds = Array.from(document.querySelectorAll('#batchTagCheckboxes input:checked')).map(cb => parseInt(cb.value));
            batchUpdateTags(tagIds, action);
        });
    }

    const cancelBatchTagsBtn = document.getElementById('cancelBatchTagsBtn');
    if (cancelBatchTagsBtn) {
        cancelBatchTagsBtn.addEventListener('click', () => {
            window.authUtils.hideModal('batchTagsModal');
        });
    }

    const confirmBatchEditBtn = document.getElementById('confirmBatchEditBtn');
    if (confirmBatchEditBtn) {
        confirmBatchEditBtn.addEventListener('click', () => {
            const reviewData = {};
            for (let i = 1; i <= 6; i++) {
                const select = document.getElementById(`batchReview${i} `);
                if (select) reviewData[`review${i} `] = select.value;
            }
            batchUpdateReviews(reviewData);
        });
    }

    const cancelBatchEditBtn = document.getElementById('cancelBatchEditBtn');
    if (cancelBatchEditBtn) {
        cancelBatchEditBtn.addEventListener('click', () => {
            window.authUtils.hideModal('batchEditModal');
        });
    }
}

// 加载单词列表
async function loadWordList() {
    const words = await getWords();

    // 应用排序
    const sortOrder = document.getElementById('sortOrder');
    if (sortOrder) {
        const order = sortOrder.value;
        if (order === 'desc') {
            words.sort((a, b) => b.id - a.id);
        } else {
            words.sort((a, b) => a.id - b.id);
        }
    }

    displayWords(words);
}



// 将所有函数挂载到全局对象
window.wordService = {
    getWords,
    displayWords,
    openAddWordModal,
    openEditWordModal,
    addWord,
    updateWord,
    deleteWord,
    searchWordsByTags,
    bindWordEvents,
    loadWordList,
    // 添加当前状态变量的访问器
    getCurrentEditingWordId: () => currentEditingWordId,
    getSelectedTagIds: () => selectedTagIds,
    getCurrentWords: () => currentWords,
    // 批量操作
    batchDelete,
    batchUpdateTags,
    batchUpdateReviews
};

