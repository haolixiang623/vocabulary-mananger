// 默写服务 (Dictation Service)
// 负责管理默写游戏的逻辑、状态和UI交互

window.dictationService = (function () {
    // 游戏状态
    let state = {
        words: [],          // 待测单词列表
        currentIndex: 0,    // 当前索引
        score: 0,           // 得分
        streak: 0,          // 当前连对
        maxStreak: 0,       // 最大连对
        mistakes: [],       // 错误记录 { word, meaning, input }
        isGameActive: false
    };

    // DOM 元素引用
    const elements = {
        modal: null,
        questionContainer: null,
        resultsContainer: null,
        progressBar: null,
        progressText: null,
        scoreText: null,
        streakContainer: null,
        streakCount: null,
        meaningDisplay: null,
        wordInput: null,
        feedbackArea: null,
        submitBtn: null,
        finalScore: null,
        mistakeList: null,
        retryBtn: null,
        closeBtn: null
    };

    // 初始化 DOM 引用
    function initElements() {
        elements.modal = document.getElementById('dictationModal');
        elements.questionContainer = document.getElementById('dictationQuestion');
        elements.resultsContainer = document.getElementById('dictationResults');
        elements.progressBar = document.getElementById('dictationProgressBar');
        elements.progressText = document.getElementById('dictationProgressText');
        elements.scoreText = document.getElementById('dictationScore');
        elements.streakContainer = document.getElementById('dictationStreak');
        elements.streakCount = document.getElementById('streakCount');
        elements.meaningDisplay = document.getElementById('dictationMeaning');
        elements.wordInput = document.getElementById('dictationInput');
        elements.feedbackArea = document.getElementById('dictationFeedback');
        elements.submitBtn = document.getElementById('dictationSubmitBtn');
        elements.finalScore = document.getElementById('dictationFinalScore');
        elements.mistakeList = document.getElementById('dictationMistakeList');
        elements.retryBtn = document.getElementById('dictationRetryBtn');
        elements.closeBtn = document.getElementById('dictationCloseBtn');
    }

    // 开始默写
    function start(wordIds) {
        initElements();

        // 获取单词数据
        const allWords = window.wordService.getCurrentWords();
        let targetWords = [];

        if (wordIds && wordIds.length > 0) {
            targetWords = allWords.filter(w => wordIds.includes(w.id));
        } else {
            // 如果没有选中，默认使用所有单词（或者提示用户）
            // 这里为了体验，如果没有选中，就随机选10个，或者全部
            targetWords = [...allWords];
        }

        if (targetWords.length === 0) {
            window.authUtils.showToast('没有可默写的单词', 'info');
            return;
        }

        // 打乱顺序
        targetWords.sort(() => Math.random() - 0.5);

        // 重置状态
        state = {
            words: targetWords,
            currentIndex: 0,
            score: 0,
            streak: 0,
            maxStreak: 0,
            mistakes: [],
            isGameActive: true
        };

        // 显示模态框
        window.authUtils.showModal('dictationModal');
        showQuestionView();
        updateUI();
    }

    // 显示问题视图
    function showQuestionView() {
        elements.questionContainer.classList.remove('hidden');
        elements.resultsContainer.classList.add('hidden');
        elements.wordInput.value = '';
        elements.wordInput.focus();
        elements.feedbackArea.textContent = '';
        elements.feedbackArea.className = 'dictation-feedback';
    }

    // 更新 UI
    function updateUI() {
        const total = state.words.length;
        const current = state.currentIndex + 1;
        const progressPercent = ((state.currentIndex) / total) * 100;

        // 进度条
        if (elements.progressBar) elements.progressBar.style.width = `${progressPercent}%`;
        if (elements.progressText) elements.progressText.textContent = `${current} / ${total}`;

        // 分数
        if (elements.scoreText) elements.scoreText.textContent = state.score;

        // 连对
        if (elements.streakContainer) {
            if (state.streak > 1) {
                elements.streakContainer.classList.remove('hidden');
                elements.streakContainer.classList.add('pulse-animation');
                elements.streakCount.textContent = state.streak;
            } else {
                elements.streakContainer.classList.add('hidden');
            }
        }

        // 当前问题
        if (state.currentIndex < total) {
            const word = state.words[state.currentIndex];
            if (elements.meaningDisplay) elements.meaningDisplay.textContent = word.meaning;
        }
    }

    // 提交答案
    function submitAnswer() {
        if (!state.isGameActive) return;

        const input = elements.wordInput.value.trim();
        if (!input) return;

        const currentWord = state.words[state.currentIndex];
        const isCorrect = input.toLowerCase() === currentWord.word.toLowerCase();

        if (isCorrect) {
            handleCorrect();
        } else {
            handleIncorrect(currentWord, input);
        }

        // 延迟进入下一题，让用户看到反馈
        state.isGameActive = false; // 锁定输入
        setTimeout(() => {
            nextQuestion();
        }, isCorrect ? 800 : 2000); // 答错多展示一会儿正确答案
    }

    // 处理正确
    function handleCorrect() {
        state.score += 10; // 每题10分
        state.streak++;
        if (state.streak > state.maxStreak) state.maxStreak = state.streak;

        // UI 反馈
        elements.wordInput.classList.add('correct-input');
        elements.feedbackArea.textContent = 'Correct! 🎉';
        elements.feedbackArea.classList.add('text-success', 'pop-in');

        // 播放音效（可选）
        // playSound('success');
    }

    // 处理错误
    function handleIncorrect(word, input) {
        state.streak = 0;
        state.mistakes.push({
            word: word.word,
            meaning: word.meaning,
            input: input
        });

        // UI 反馈
        elements.wordInput.classList.add('shake-animation', 'error-input');
        elements.feedbackArea.innerHTML = `Nice try! The answer is <strong>${word.word}</strong>`;
        elements.feedbackArea.classList.add('text-danger');
    }

    // 下一题
    function nextQuestion() {
        state.currentIndex++;
        state.isGameActive = true;

        // 清除动画类
        elements.wordInput.classList.remove('correct-input', 'error-input', 'shake-animation');
        elements.feedbackArea.classList.remove('text-success', 'text-danger', 'pop-in');

        if (state.currentIndex >= state.words.length) {
            showResults();
        } else {
            showQuestionView();
            updateUI();
        }
    }

    // 显示结果
    function showResults() {
        elements.questionContainer.classList.add('hidden');
        elements.resultsContainer.classList.remove('hidden');

        // 计算最终得分（百分比）
        const total = state.words.length;
        const correctCount = total - state.mistakes.length;
        const percentage = Math.round((correctCount / total) * 100);

        elements.finalScore.textContent = `${percentage}%`;

        // 渲染错误列表
        elements.mistakeList.innerHTML = '';
        if (state.mistakes.length === 0) {
            elements.mistakeList.innerHTML = '<div class="perfect-score">Perfect! You got everything right! 🌟</div>';
        } else {
            state.mistakes.forEach(m => {
                const div = document.createElement('div');
                div.className = 'mistake-item';
                div.innerHTML = `
                    <div class="mistake-info">
                        <span class="mistake-word">${m.word}</span>
                        <span class="mistake-meaning">${m.meaning}</span>
                    </div>
                    <div class="mistake-input">You typed: <span class="strike">${m.input}</span></div>
                `;
                elements.mistakeList.appendChild(div);
            });
        }
    }

    // 重试错误单词
    function retryMistakes() {
        if (state.mistakes.length === 0) {
            // 如果全对，就重新开始所有
            start(state.words.map(w => w.id));
            return;
        }

        // 找出错误的单词对象
        const wrongWords = state.words.filter(w =>
            state.mistakes.some(m => m.word === w.word)
        );

        // 重新开始
        state.words = wrongWords;
        state.currentIndex = 0;
        state.score = 0;
        state.streak = 0;
        state.mistakes = [];
        state.isGameActive = true;

        showQuestionView();
        updateUI();
    }

    // 绑定事件
    function bindEvents() {
        // 提交按钮
        if (elements.submitBtn) {
            elements.submitBtn.addEventListener('click', submitAnswer);
        }

        // 输入框回车
        if (elements.wordInput) {
            elements.wordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitAnswer();
                }
            });
        }

        // 重试按钮
        if (elements.retryBtn) {
            elements.retryBtn.addEventListener('click', retryMistakes);
        }

        // 关闭按钮
        if (elements.closeBtn) {
            elements.closeBtn.addEventListener('click', () => {
                window.authUtils.hideModal('dictationModal');
            });
        }
    }

    // 初始化
    document.addEventListener('DOMContentLoaded', () => {
        // 延迟绑定，确保DOM已加载
        setTimeout(() => {
            initElements();
            bindEvents();
        }, 500);
    });

    return {
        start
    };
})();
