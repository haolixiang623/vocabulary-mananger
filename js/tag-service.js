// 标签管理服务
// 使用全局对象而不是import语句
// 直接使用window.supabaseClient，避免重复声明
// 直接使用window.authUtils，避免重复声明

// 获取所有标签（包含关联单词数量）
async function getTags() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 获取用户的所有标签
        const { data: tags, error: tagsError } = await window.supabaseClient
            .from('tags')
            .select('*')
            .eq('user_id', user.id)
            .order('tag_name');

        if (tagsError) throw tagsError;

        // 获取每个标签关联的单词数量
        const tagsWithCount = await Promise.all(
            tags.map(async (tag) => {
                // 注意：确保符合RLS策略，添加用户过滤
                const { count, error: countError } = await window.supabaseClient
                    .from('word_tags')
                    .select('*', { count: 'exact', head: true })
                    .eq('tag_id', tag.tag_id);

                if (countError) {
                    console.error('Get tag count error:', countError);
                    return { ...tag, wordCount: 0 };
                }

                return { ...tag, wordCount: count || 0 };
            })
        );

        return tagsWithCount;
    } catch (error) {
        console.error('Get tags error:', error);
        window.authUtils.showToast?.('获取标签失败', 'error');
        return [];
    }
}

// 创建标签
async function createTag(tagName) {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 检查标签是否已存在
        const { data: existingTags } = await window.supabaseClient
            .from('tags')
            .select('tag_id')
            .eq('user_id', user.id)
            .eq('tag_name', tagName.trim());

        if (existingTags && existingTags.length > 0) {
            window.authUtils.showToast?.('标签名称已存在', 'error');
            return { success: false };
        }

        // 创建新标签
        const { data, error } = await window.supabaseClient
            .from('tags')
            .insert({
                user_id: user.id,
                tag_name: tagName.trim()
            })
            .select()
            .single();

        if (error) throw error;

        window.authUtils.showToast?.('标签创建成功', 'success');
        return { success: true, tag: data };
    } catch (error) {
        console.error('Create tag error:', error);
        window.authUtils.showToast?.(error.message || '创建标签失败', 'error');
        return { success: false, error };
    }
}

// 更新标签
async function updateTag(tagId, newName) {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 检查新名称是否与其他标签重复
        const { data: existingTags } = await window.supabaseClient
            .from('tags')
            .select('tag_id')
            .eq('user_id', user.id)
            .eq('tag_name', newName.trim())
            .neq('tag_id', tagId);

        if (existingTags && existingTags.length > 0) {
            window.authUtils.showToast?.('标签名称已存在', 'error');
            return { success: false };
        }

        // 更新标签
        const { data, error } = await window.supabaseClient
            .from('tags')
            .update({ tag_name: newName.trim() })
            .eq('tag_id', tagId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

        window.authUtils.showToast?.('标签更新成功', 'success');
        return { success: true, tag: data };
    } catch (error) {
        console.error('Update tag error:', error);
        window.authUtils.showToast?.(error.message || '更新标签失败', 'error');
        return { success: false, error };
    }
}

// 删除标签
async function deleteTag(tagId) {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 获取关联的单词数量
        // RLS策略会自动通过word_id关联检查权限，返回当前用户相关的数据
        const { count } = await window.supabaseClient
            .from('word_tags')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tagId);

        // 显示确认对话框
        return new Promise((resolve) => {
            const confirmMessage = `该标签关联${count || 0}个单词，删除后单词将移除该标签，是否继续？`;
            if (confirm(confirmMessage)) {
                // 删除标签（关联关系会通过CASCADE自动删除）
                window.supabaseClient
                    .from('tags')
                    .delete()
                    .eq('tag_id', tagId)
                    .eq('user_id', user.id)
                    .then(({ error }) => {
                        if (error) throw error;
                        window.authUtils.showToast?.('标签删除成功', 'success');
                        resolve({ success: true });
                    })
                    .catch((error) => {
                        console.error('Delete tag error:', error);
                        window.authUtils.showToast?.(error.message || '删除标签失败', 'error');
                        resolve({ success: false, error });
                    });
            } else {
                resolve({ success: false, cancelled: true });
            }
        });
    } catch (error) {
        console.error('Delete tag error:', error);
        window.authUtils.showToast?.(error.message || '删除标签失败', 'error');
        return { success: false, error };
    }
}

// 显示标签管理模态框
function showTagModal() {
    window.authUtils.showModal('tagModal');
    loadTagList();
}

// 加载标签列表
async function loadTagList() {
    const tags = await getTags();
    const tbody = document.getElementById('tagTableBody');
    
    if (!tbody) return;

    tbody.innerHTML = '';

    if (tags.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">暂无标签</td></tr>';
        return;
    }

    tags.forEach(tag => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="tag-name-display" data-tag-id="${tag.tag_id}">${escapeHtml(tag.tag_name)}</span>
                <input type="text" class="tag-name-edit hidden" value="${escapeHtml(tag.tag_name)}" data-tag-id="${tag.tag_id}">
            </td>
            <td>${tag.wordCount}</td>
            <td class="tag-actions">
                <button class="btn btn-primary btn-small edit-tag-btn" data-tag-id="${tag.tag_id}">编辑</button>
                <button class="btn btn-danger btn-small delete-tag-btn" data-tag-id="${tag.tag_id}">删除</button>
                <button class="btn btn-success btn-small save-tag-btn hidden" data-tag-id="${tag.tag_id}">保存</button>
                <button class="btn btn-secondary btn-small cancel-tag-btn hidden" data-tag-id="${tag.tag_id}">取消</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 绑定编辑按钮事件
    document.querySelectorAll('.edit-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tagId = e.target.dataset.tagId;
            const row = e.target.closest('tr');
            row.querySelector('.tag-name-display').classList.add('hidden');
            row.querySelector('.tag-name-edit').classList.remove('hidden');
            row.querySelector('.edit-tag-btn').classList.add('hidden');
            row.querySelector('.delete-tag-btn').classList.add('hidden');
            row.querySelector('.save-tag-btn').classList.remove('hidden');
            row.querySelector('.cancel-tag-btn').classList.remove('hidden');
        });
    });

    // 绑定保存按钮事件
    document.querySelectorAll('.save-tag-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tagId = e.target.dataset.tagId;
            const input = document.querySelector(`.tag-name-edit[data-tag-id="${tagId}"]`);
            const newName = input.value.trim();
            
            if (!newName) {
                window.authUtils.showToast?.('标签名称不能为空', 'error');
                return;
            }

            const result = await updateTag(parseInt(tagId), newName);
            if (result.success) {
                loadTagList();
            }
        });
    });

    // 绑定取消按钮事件
    document.querySelectorAll('.cancel-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            loadTagList();
        });
    });

    // 绑定删除按钮事件
    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tagId = e.target.dataset.tagId;
            const result = await deleteTag(parseInt(tagId));
            if (result.success) {
                loadTagList();
            }
        });
    });
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 绑定标签管理事件
function bindTagEvents() {
    // 添加标签按钮
    const addTagBtn = document.getElementById('addTagBtn');
    if (addTagBtn) {
        addTagBtn.addEventListener('click', async () => {
            const input = document.getElementById('newTagNameInput');
            const tagName = input.value.trim();
            
            if (!tagName) {
                window.authUtils.showToast?.('请输入标签名称', 'error');
                return;
            }

            const result = await createTag(tagName);
            if (result.success) {
                input.value = '';
                loadTagList();
            }
        });
    }

    // 关闭标签管理模态框
    const closeTagModalBtn = document.getElementById('closeTagModalBtn');
    if (closeTagModalBtn) {
        closeTagModalBtn.addEventListener('click', () => {
            window.authUtils.hideModal('tagModal');
        });
    }

    // 回车键添加标签
    const newTagNameInput = document.getElementById('newTagNameInput');
    if (newTagNameInput) {
        newTagNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTagBtn.click();
            }
        });
    }
}

// 将所有函数挂载到全局对象
window.tagService = {
    getTags,
    createTag,
    updateTag,
    deleteTag,
    showTagModal,
    loadTagList,
    bindTagEvents
};

