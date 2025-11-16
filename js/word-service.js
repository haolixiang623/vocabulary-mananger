// 单词管理服务
import { supabase } from './supabase-client.js';
import { showToast, showModal, hideModal } from './auth.js';
import { getTags } from './tag-service.js';

let currentEditingWordId = null;
let selectedTagIds = new Set(); // 用于搜索的选中标签
let currentWords = []; // 当前显示的单词列表

// 获取所有单词（包含标签）
export async function getWords() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 获取用户的所有单词
        const { data: words, error: wordsError } = await supabase
            .from('words')
            .select('*')
            .eq('user_id', user.id)
            .order('id', { ascending: true });

        if (wordsError) throw wordsError;

        // 获取所有标签关联
        const { data: wordTags, error: wordTagsError } = await supabase
            .from('word_tags')
            .select('*');

        if (wordTagsError) throw wordTagsError;

        // 获取所有标签
        const { data: tags, error: tagsError } = await supabase
            .from('tags')
            .select('*')
            .eq('user_id', user.id);

        if (tagsError) throw tagsError;

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
        showToast('获取单词列表失败', 'error');
        return [];
    }
}

// 显示单词列表
export function displayWords(words) {
    const tbody = document.getElementById('wordTableBody');
    const emptyState = document.getElementById('emptyState');
    const wordCount = document.getElementById('wordCount');

    if (!tbody) return;

    tbody.innerHTML = '';

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

// 打开添加单词模态框
export function openAddWordModal() {
    currentEditingWordId = null;
    const modal = document.getElementById('wordModal');
    const title = document.getElementById('wordModalTitle');
    const form = document.getElementById('wordForm');
    const reviewSection = document.getElementById('reviewSection');

    if (title) title.textContent = '添加单词';
    if (form) form.reset();
    if (reviewSection) reviewSection.classList.add('hidden');

    loadTagCheckboxes();
    showModal('wordModal');
}

// 打开编辑单词模态框
export async function openEditWordModal(wordId) {
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
        showToast('单词不存在', 'error');
        return;
    }

    // 填充表单
    const wordInput = document.getElementById('wordInput');
    const meaningInput = document.getElementById('meaningInput');
    
    if (wordInput) wordInput.value = word.word;
    if (meaningInput) meaningInput.value = word.meaning;

    // 填充复习记录
    for (let i = 1; i <= 6; i++) {
        const reviewSelect = document.getElementById(`review${i}`);
        if (reviewSelect) {
            reviewSelect.value = word[`review${i}`] || '';
        }
    }

    if (reviewSection) reviewSection.classList.remove('hidden');

    // 加载标签复选框（选中当前单词的标签）
    loadTagCheckboxes(wordId);

    showModal('wordModal');
}

// 加载标签复选框
async function loadTagCheckboxes(selectedWordId = null) {
    const container = document.getElementById('tagCheckboxes');
    if (!container) return;

    container.innerHTML = '';

    const tags = await getTags();
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
            <input type="checkbox" id="tag_${tag.tag_id}" value="${tag.tag_id}" ${selectedTagIds.has(tag.tag_id) ? 'checked' : ''}>
            <label for="tag_${tag.tag_id}">${escapeHtml(tag.tag_name)}</label>
        `;
        container.appendChild(div);
    });
}

// 添加单词
export async function addWord(wordData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 插入单词
        const { data: word, error: wordError } = await supabase
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

            const { error: wordTagsError } = await supabase
                .from('word_tags')
                .insert(wordTagInserts);

            if (wordTagsError) throw wordTagsError;
        }

        showToast('单词添加成功', 'success');
        return { success: true, word };
    } catch (error) {
        console.error('Add word error:', error);
        showToast(error.message || '添加单词失败', 'error');
        return { success: false, error };
    }
}

// 更新单词
export async function updateWord(wordId, wordData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 更新单词
        const { error: wordError } = await supabase
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

        // 删除旧的标签关联
        const { error: deleteError } = await supabase
            .from('word_tags')
            .delete()
            .eq('word_id', wordId);

        if (deleteError) throw deleteError;

        // 插入新的标签关联
        if (wordData.tagIds && wordData.tagIds.length > 0) {
            const wordTagInserts = wordData.tagIds.map(tagId => ({
                word_id: wordId,
                tag_id: tagId
            }));

            const { error: wordTagsError } = await supabase
                .from('word_tags')
                .insert(wordTagInserts);

            if (wordTagsError) throw wordTagsError;
        }

        showToast('单词更新成功', 'success');
        return { success: true };
    } catch (error) {
        console.error('Update word error:', error);
        showToast(error.message || '更新单词失败', 'error');
        return { success: false, error };
    }
}

// 删除单词
export async function deleteWord(wordId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        if (!confirm('确定要删除这个单词吗？')) {
            return { success: false, cancelled: true };
        }

        // 删除单词（关联关系会通过CASCADE自动删除）
        const { error } = await supabase
            .from('words')
            .delete()
            .eq('id', wordId)
            .eq('user_id', user.id);

        if (error) throw error;

        showToast('单词删除成功', 'success');
        return { success: true };
    } catch (error) {
        console.error('Delete word error:', error);
        showToast(error.message || '删除单词失败', 'error');
        return { success: false, error };
    }
}

// 搜索单词（按标签）
export async function searchWordsByTags(tagIds) {
    if (!tagIds || tagIds.length === 0) {
        return await getWords();
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 获取包含所有选中标签的单词ID
        // 使用子查询找到同时包含所有标签的单词
        const { data: wordTags, error } = await supabase
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
        showToast('搜索失败', 'error');
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
export function bindWordEvents() {
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
                showToast('请填写单词和中文释义', 'error');
                return;
            }

            // 获取选中的标签
            const checkedTags = Array.from(document.querySelectorAll('#tagCheckboxes input[type="checkbox"]:checked'))
                .map(cb => parseInt(cb.value));

            // 获取复习记录
            const reviewData = {};
            for (let i = 1; i <= 6; i++) {
                const reviewSelect = document.getElementById(`review${i}`);
                if (reviewSelect) {
                    reviewData[`review${i}`] = reviewSelect.value || '';
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
                hideModal('wordModal');
                await loadWordList();
            }
        });
    }

    // 取消按钮
    const cancelWordBtn = document.getElementById('cancelWordBtn');
    if (cancelWordBtn) {
        cancelWordBtn.addEventListener('click', () => {
            hideModal('wordModal');
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
                    showToast('请使用"管理标签"功能添加新标签', 'info');
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
}

// 加载单词列表
export async function loadWordList() {
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

// 导出函数供其他模块使用
export { currentWords };

