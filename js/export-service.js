// Excel导出服务
// 使用全局对象而不是import语句

// 初始化服务对象引用
function initServiceReferences() {
    return {
        wordService: window.wordService || {},
        authUtils: window.authUtils || {},
        supabaseClient: window.supabaseClient || {}
    };
}

// 导出单词到Excel
async function exportToExcel() {
    try {
        // 获取服务引用
        const { wordService, authUtils } = initServiceReferences();
        const { getWords, getCurrentWords } = wordService;

        let words = (getCurrentWords && getCurrentWords().length > 0) ? getCurrentWords() : await getWords();

        if (words.length === 0) {
            authUtils.showToast?.('没有可导出的单词', 'info');
            return;
        }

        // 按序号升序排序
        words.sort((a, b) => a.id - b.id);

        // 准备数据
        const data = [];

        // 表头
        data.push([
            '单词序号',
            '单词',
            '中文释义',
            '标签（用逗号分隔）',
            '第1次复习',
            '第2次复习',
            '第3次复习',
            '第4次复习',
            '第5次复习',
            '第6次复习'
        ]);

        // 数据行
        words.forEach(word => {
            const tagNames = word.tags ? word.tags.join(',') : '';
            data.push([
                word.id,
                word.word,
                word.meaning,
                tagNames,
                word.review1 || '',
                word.review2 || '',
                word.review3 || '',
                word.review4 || '',
                word.review5 || '',
                word.review6 || ''
            ]);
        });

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // 设置列宽
        ws['!cols'] = [
            { wch: 12 }, // 单词序号
            { wch: 20 }, // 单词
            { wch: 30 }, // 中文释义
            { wch: 30 }, // 标签
            { wch: 15 }, // 第1次复习
            { wch: 15 }, // 第2次复习
            { wch: 15 }, // 第3次复习
            { wch: 15 }, // 第4次复习
            { wch: 15 }, // 第5次复习
            { wch: 15 }  // 第6次复习
        ];

        // 添加工作表
        XLSX.utils.book_append_sheet(wb, ws, '单词管理记录');

        // 生成文件名
        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const fileName = `单词管理记录_${dateStr}.xlsx`;

        // 导出文件
        XLSX.writeFile(wb, fileName);

        window.authUtils.showToast?.('导出成功', 'success');
    } catch (error) {
        console.error('Export to Excel error:', error);
        window.authUtils.showToast?.('导出失败', 'error');
    }
}

// 下载Excel模板
async function downloadExcelTemplate() {
    try {
        // 获取服务引用
        const { authUtils } = initServiceReferences();

        // 创建工作簿
        const wb = XLSX.utils.book_new();

        // 创建表头
        const headers = [
            ['单词', '中文释义', '标签（用逗号分隔）', '状态', '第1次复习', '第2次复习', '第3次复习', '第4次复习', '第5次复习', '第6次复习']
        ];

        // 添加示例数据
        const exampleData = [
            ['hello', '你好', '日常词汇,基础词汇', '未掌握', '', '', '', '', '', ''],
            ['world', '世界', '日常词汇', '已掌握', '已完成', '', '', '', '', ''],
            ['example', '例子', '基础词汇', '学习中', '', '未完成', '', '', '', '']
        ];

        const data = [...headers, ...exampleData];
        const ws = XLSX.utils.aoa_to_sheet(data);

        // 设置列宽
        ws['!cols'] = [
            { wch: 20 }, // 单词
            { wch: 30 }, // 中文释义
            { wch: 30 }, // 标签
            { wch: 12 }, // 状态
            { wch: 15 }, // 第1次复习
            { wch: 15 }, // 第2次复习
            { wch: 15 }, // 第3次复习
            { wch: 15 }, // 第4次复习
            { wch: 15 }, // 第5次复习
            { wch: 15 }  // 第6次复习
        ];

        // 添加工作表
        XLSX.utils.book_append_sheet(wb, ws, '单词导入模板');

        // 导出文件
        XLSX.writeFile(wb, '单词导入模板.xlsx');
        window.authUtils.showToast?.('模板下载成功', 'success');
    } catch (error) {
        console.error('Download template error:', error);
        window.authUtils.showToast?.('模板下载失败', 'error');
    }
}

// 加载Excel文件
function loadExcelFile(file) {
    return new Promise((resolve, reject) => {
        // 获取服务引用
        const { authUtils } = initServiceReferences();

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 读取第一个工作表
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // 转换为JSON数组
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                // 检查是否有数据
                if (!jsonData || jsonData.length < 2) {
                    authUtils.showToast?.('Excel文件格式错误：至少需要包含表头和数据行', 'error');
                    reject(new Error('Excel文件格式错误'));
                    return;
                }

                resolve(jsonData);
            } catch (error) {
                console.error('读取Excel文件错误:', error);
                authUtils.showToast?.('读取Excel文件失败: ' + error.message, 'error');
                reject(error);
            }
        };

        reader.onerror = function () {
            authUtils.showToast?.('读取文件失败', 'error');
            reject(new Error('读取文件失败'));
        };

        reader.readAsArrayBuffer(file);
    });
}

// 导入Excel文件
async function importExcelFile(file) {
    try {
        // 获取服务引用（loadExcelFile中会再次获取，这里只是为了完整性）
        const jsonData = await loadExcelFile(file);

        // 解析并导入数据
        await parseAndImportExcelData(jsonData);
    } catch (error) {
        console.error('Import Excel error:', error);
        // 错误已在loadExcelFile中处理，这里可以不重复显示错误
    }
}

// 解析并导入Excel数据
async function parseAndImportExcelData(jsonData) {
    // 获取服务引用
    const { authUtils, supabaseClient, wordService } = initServiceReferences();

    if (!jsonData || jsonData.length < 2) {
        authUtils.showToast?.('Excel文件格式错误：至少需要包含表头和数据行', 'error');
        return;
    }

    // 获取表头（第一行）
    const headers = jsonData[0].map(h => String(h).trim().toLowerCase());

    // 查找列索引
    const wordIndex = findColumnIndex(headers, ['单词', 'word']);
    const meaningIndex = findColumnIndex(headers, ['中文释义', 'meaning', '释义']);
    const tagIndex = findColumnIndex(headers, ['标签', 'tag', 'tags', '标签（用逗号分隔）']);
    const statusIndex = findColumnIndex(headers, ['状态', 'status', '学习状态']);
    const reviewIndices = [];
    for (let i = 1; i <= 6; i++) {
        reviewIndices.push(findColumnIndex(headers, [`第${i}次复习`, `review${i}`, `复习${i}`]));
    }

    // 验证必需字段
    if (wordIndex === -1 || meaningIndex === -1) {
        authUtils.showToast?.('Excel文件格式错误：缺少必需字段（单词、中文释义）', 'error');
        return;
    }

    const { data: { user } } = await supabaseClient?.auth?.getUser() || { data: { user: null } };
    if (!user) {
        authUtils.showToast?.('用户未登录', 'error');
        return;
    }

    // 获取所有已存在的单词（用于重复检查）
    const { data: existingWords } = await supabaseClient?.from('words')
        .select('word')
        .eq('user_id', user.id) || { data: [] };

    const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));

    // 解析数据行
    const results = {
        success: [],
        failed: [],
        skipped: []
    };

    const wordsToAdd = [];
    const wordTagsToAdd = [];

    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const word = String(row[wordIndex] || '').trim();
        const meaning = String(row[meaningIndex] || '').trim();

        // 跳过空行
        if (!word && !meaning) {
            continue;
        }

        // 验证必需字段
        if (!word) {
            results.failed.push({
                row: i + 1,
                word: word || '(空)',
                reason: '单词不能为空'
            });
            continue;
        }

        if (!meaning) {
            results.failed.push({
                row: i + 1,
                word: word,
                reason: '中文释义不能为空'
            });
            continue;
        }

        // 检查是否已存在相同单词
        if (existingWordSet.has(word.toLowerCase())) {
            results.skipped.push({
                row: i + 1,
                word: word,
                reason: '单词已存在'
            });
            continue;
        }

        // 添加到已存在集合中，避免同批次重复
        existingWordSet.add(word.toLowerCase());

        // 解析标签
        let tags = [];
        if (tagIndex !== -1 && row[tagIndex]) {
            const tagStr = String(row[tagIndex]).trim();
            if (tagStr) {
                tags = tagStr.split(/[,，]/).map(t => t.trim()).filter(t => t);
            }
        }

        // 解析状态（暂时不处理，因为数据库中没有状态字段）
        // 如果需要，可以添加mastered字段

        // 解析复习记录
        const reviews = {};
        reviewIndices.forEach((index, idx) => {
            if (index !== -1 && row[index]) {
                const reviewValue = String(row[index]).trim();
                if (reviewValue === '已完成' || reviewValue === '未完成') {
                    reviews[`review${idx + 1}`] = reviewValue;
                }
            }
        });

        // 创建单词对象
        const newWord = {
            word: word,
            meaning: meaning,
            review1: reviews.review1 || '',
            review2: reviews.review2 || '',
            review3: reviews.review3 || '',
            review4: reviews.review4 || '',
            review5: reviews.review5 || '',
            review6: reviews.review6 || '',
            tags: tags
        };

        wordsToAdd.push(newWord);

        results.success.push({
            row: i + 1,
            word: word,
            meaning: meaning
        });
    }

    // 批量插入单词
    if (wordsToAdd.length > 0) {
        const wordInserts = wordsToAdd.map(w => ({
            user_id: user.id,
            word: w.word,
            meaning: w.meaning,
            review1: w.review1,
            review2: w.review2,
            review3: w.review3,
            review4: w.review4,
            review5: w.review5,
            review6: w.review6
        }));

        const { data: insertedWords, error: insertError } = await supabaseClient?.from('words')
            .insert(wordInserts)
            .select() || { data: [], error: null };

        if (insertError) {
            console.error('插入单词错误:', insertError);
            authUtils.showToast?.('导入单词失败: ' + insertError.message, 'error');
            return;
        }

        // 处理标签
        if (insertedWords && insertedWords.length > 0) {
            for (let i = 0; i < insertedWords.length; i++) {
                const word = insertedWords[i];
                const tags = wordsToAdd[i].tags;

                if (tags.length > 0) {
                    // 获取或创建标签
                    const tagIds = [];
                    for (const tagName of tags) {
                        // 检查标签是否存在
                        let { data: existingTag } = await supabaseClient?.from('tags')
                            .select('tag_id')
                            .eq('user_id', user.id)
                            .eq('tag_name', tagName)
                            .single() || { data: null };

                        let tagId;
                        if (existingTag) {
                            tagId = existingTag.tag_id;
                        } else {
                            // 创建新标签
                            const { data: newTag, error: tagError } = await supabaseClient?.from('tags')
                                .insert({
                                    user_id: user.id,
                                    tag_name: tagName
                                })
                                .select()
                                .single() || { data: null, error: null };

                            if (tagError) {
                                console.error('Create tag error:', tagError);
                                continue;
                            }
                            tagId = newTag.tag_id;
                        }

                        tagIds.push(tagId);
                    }

                    // 创建标签关联
                    if (tagIds.length > 0) {
                        const wordTagInserts = tagIds.map(tagId => ({
                            word_id: word.id,
                            tag_id: tagId
                        }));

                        // 使用正确的方式插入word_tags，RLS策略会自动通过word_id关联检查权限
                        const { error: wordTagError } = await supabaseClient?.from('word_tags')
                            .insert(wordTagInserts);

                        if (wordTagError) {
                            console.error('插入标签关联失败:', wordTagError);
                            // 记录错误但不中断整个导入过程
                            continue;
                        }
                    }
                }
            }
        }
    }


    // 显示导入结果
    const total = results.success.length + results.failed.length + results.skipped.length;
    const message = `导入完成！成功：${results.success.length}，失败：${results.failed.length}，跳过：${results.skipped.length}`;
    authUtils.showToast?.(message, results.failed.length > 0 ? 'error' : 'success');

    // 刷新单词列表
    await wordService?.loadWordList?.();
}

// 查找列索引
function findColumnIndex(headers, keywords) {
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase();
        if (lowerKeywords.some(keyword => header.includes(keyword) || keyword.includes(header))) {
            return i;
        }
    }
    return -1;
}

// 将所有函数挂载到全局对象
window.exportService = {
    exportToExcel,
    downloadExcelTemplate,
    importExcelFile,
    parseAndImportExcelData,
    loadExcelFile
};

