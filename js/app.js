// 主应用逻辑 - 修改为使用全局对象，支持直接文件访问

// 获取全局对象
// 直接使用window对象上的服务，避免变量重复声明

// 全局变量
let selectedSearchTags = new Set();

// 初始化应用
async function initApp() {
    try {
        // 初始化认证
        if (window.authUtils?.initAuth) {
            await window.authUtils.initAuth();
        }
        if (window.authUtils?.bindAuthEvents) {
            window.authUtils.bindAuthEvents();
        }
        
        // 绑定单词相关事件
        if (window.wordService?.bindWordEvents) {
            window.wordService.bindWordEvents();
        }
        
        // 绑定标签相关事件
        // bindTagEvents(); // 将在后续修改
        
        // 绑定其他事件
        bindOtherEvents();
        
        // 如果已登录，加载数据
        if (window.supabaseClient && window.supabaseClient.auth && window.supabaseClient.auth.getSession) {
            const result = await window.supabaseClient.auth.getSession();
            if (result.data && result.data.session) {
                await loadInitialData();
            }
        }
    } catch (error) {
        console.error('初始化应用失败:', error);
        if (window.authUtils?.showToast) {
            window.authUtils.showToast('应用初始化失败', 'error');
        }
    }
}

// 加载初始数据
async function loadInitialData() {
    if (window.wordService && window.wordService.loadWordList) {
        await window.wordService.loadWordList();
    }
    await loadTagSelector();
}

// 加载标签选择器（用于搜索）
async function loadTagSelector() {
    let tags = [];
    if (window.tagService && window.tagService.getTags) {
        tags = await window.tagService.getTags();
    }
    const container = document.getElementById('tagSelector');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    tags.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'tag-checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="search_tag_${tag.tag_id}" value="${tag.tag_id}">
            <label for="search_tag_${tag.tag_id}">${tag.tag_name}</label>
        `;
        container.appendChild(div);
        
        // 绑定复选框事件
        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            const tagId = parseInt(e.target.value);
            if (e.target.checked) {
                selectedSearchTags.add(tagId);
            } else {
                selectedSearchTags.delete(tagId);
            }
        });
    });
}

// 绑定其他事件
function bindOtherEvents() {
    // 管理标签按钮
    const manageTagsBtn = document.getElementById('manageTagsBtn');
    if (manageTagsBtn) {
        manageTagsBtn.addEventListener('click', () => {
            window.tagService.showTagModal();
        });
    }
    
    // 导出Excel按钮
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            if (window.exportService && window.exportService.exportToExcel) {
                window.exportService.exportToExcel();
            }
        });
    }
    
    // 导入Excel按钮
    const importExcelBtn = document.getElementById('importExcelBtn');
    const excelFileInput = document.getElementById('excelFileInput');
    if (importExcelBtn && excelFileInput) {
        importExcelBtn.addEventListener('click', () => {
            excelFileInput.click();
        });
        
        excelFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && window.exportService && window.exportService.importExcelFile) {
                window.exportService.importExcelFile(file);
                e.target.value = ''; // 清空文件选择，允许重复选择
            }
        });
    }
    
    // 搜索按钮
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            await performSearch();
        });
    }
    
    // 清空筛选按钮
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', async () => {
            selectedSearchTags.clear();
            // 取消所有复选框的选中状态
            document.querySelectorAll('#tagSelector input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            if (window.wordService && window.wordService.loadWordList) {
                await window.wordService.loadWordList();
            }
            if (window.authUtils?.showToast) {
                window.authUtils.showToast('筛选已清空', 'info');
            }
        });
    }
    
    // 模态框外部点击关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

// 执行搜索
async function performSearch() {
    const tagIds = Array.from(selectedSearchTags);
    
    if (tagIds.length === 0) {
        if (window.authUtils?.showToast) {
            window.authUtils.showToast('请至少选择一个标签', 'info');
        }
        if (window.wordService && window.wordService.loadWordList) {
            await window.wordService.loadWordList();
        }
        return;
    }
    
    if (window.wordService && window.wordService.searchWordsByTags) {
        const words = await window.wordService.searchWordsByTags(tagIds);
        
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
        
        if (window.wordService && window.wordService.displayWords) {
            window.wordService.displayWords(words);
        }
        if (window.authUtils?.showToast) {
            window.authUtils.showToast(`找到 ${words.length} 个单词`, 'success');
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 显示登录模态框
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.add('show');
    }
    
    // 隐藏主应用容器
    const appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.classList.add('hidden');
    }
    
    // 执行初始化，让auth模块正确处理登录状态
    setTimeout(function() {
        // 使用async函数包装所有初始化逻辑
        (async function() {
            try {
                if (window.authUtils && window.authUtils.initAuth) {
                    await window.authUtils.initAuth();
                }
                if (window.authUtils && window.authUtils.bindAuthEvents) {
                    window.authUtils.bindAuthEvents();
                }
                
                // 绑定其他事件
                bindOtherEvents();
                
                // 如果已登录，加载数据
                if (window.supabaseClient && window.supabaseClient.auth && window.supabaseClient.auth.getSession) {
                    const result = await window.supabaseClient.auth.getSession();
                    if (result.data && result.data.session) {
                        // 绑定单词相关事件
                        if (window.wordService?.bindWordEvents) {
                            window.wordService.bindWordEvents();
                        }
                        // 加载初始数据
                        await loadInitialData();
                    }
                }
            } catch (error) {
                console.error('应用初始化失败:', error);
                // 错误处理
                if (window.authUtils && window.authUtils.showToast) {
                    window.authUtils.showToast('应用初始化失败，请刷新页面重试', 'error');
                } else {
                    // 显示错误提示
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;';
                    errorDiv.innerHTML = `
                        <h2 style="color: #e74c3c; margin-bottom: 1rem;">应用加载错误</h2>
                        <p>应用初始化失败，请刷新页面重试。</p>
                        <p>错误详情: ${error.message}</p>
                    `;
                    document.body.appendChild(errorDiv);
                }
            }
        })();
    }, 100);
});

