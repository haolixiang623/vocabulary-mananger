// 主应用逻辑
import { initAuth, bindAuthEvents, showToast } from './auth.js';
import { bindWordEvents, loadWordList, displayWords, searchWordsByTags } from './word-service.js';
import { bindTagEvents, showTagModal, getTags, loadTagList } from './tag-service.js';
import { exportToExcel, downloadExcelTemplate, importExcelFile } from './export-service.js';
import { supabase } from './supabase-client.js';

// 全局变量
let selectedSearchTags = new Set();

// 初始化应用
async function initApp() {
    // 初始化认证
    await initAuth();
    bindAuthEvents();
    
    // 绑定单词相关事件
    bindWordEvents();
    
    // 绑定标签相关事件
    bindTagEvents();
    
    // 绑定其他事件
    bindOtherEvents();
    
    // 如果已登录，加载数据
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await loadInitialData();
    }
}

// 加载初始数据
async function loadInitialData() {
    await loadWordList();
    await loadTagSelector();
}

// 加载标签选择器（用于搜索）
async function loadTagSelector() {
    const tags = await getTags();
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
            showTagModal();
        });
    }
    
    // 导出Excel按钮
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            exportToExcel();
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
            if (file) {
                importExcelFile(file);
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
            await loadWordList();
            showToast('筛选已清空', 'info');
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
        showToast('请至少选择一个标签', 'info');
        await loadWordList();
        return;
    }
    
    const words = await searchWordsByTags(tagIds);
    
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
    showToast(`找到 ${words.length} 个单词`, 'success');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

