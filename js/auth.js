// 用户认证模块 - 修改为全局变量方式，支持直接文件访问

// 直接使用window.supabaseClient，避免变量重复声明

// 确保window.authUtils对象存在
window.authUtils = window.authUtils || {};

// 显示模态框 - 作为authUtils的方法
window.authUtils.showModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
};

// 隐藏模态框 - 作为authUtils的方法
window.authUtils.hideModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
};

// 检查登录状态
async function checkAuth() {
    try {
        if (window.supabaseClient && window.supabaseClient.auth && window.supabaseClient.auth.getSession) {
            const { data } = await window.supabaseClient.auth.getSession();
            return data?.session || null;
        }
        return null;
    } catch (error) {
        console.error('Check auth error:', error);
        return null;
    }
}

// 获取当前用户
async function getCurrentUser() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
}

// 函数定义部分 - 全局对象挂载移至文件末尾

// 用户注册
async function signUp(email, password) {
    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            window.authUtils.showToast?.('注册成功！请检查邮箱验证链接', 'success');
            return { success: true, user: data.user };
        }

        return { success: false };
    } catch (error) {
        console.error('Sign up error:', error);
        window.authUtils.showToast?.(error.message || '注册失败，请重试', 'error');
        return { success: false, error };
    }
}

// 用户登录
async function signIn(email, password) {
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            window.authUtils.showToast?.('登录成功', 'success');
            return { success: true, user: data.user, session: data.session };
        }

        return { success: false };
    } catch (error) {
        console.error('Sign in error:', error);
        window.authUtils.showToast?.(error.message || '登录失败，请检查邮箱和密码', 'error');
        return { success: false, error };
    }
}

// 用户登出
async function signOut() {
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;

        window.authUtils.showToast?.('已登出', 'info');
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        window.authUtils.showToast?.('登出失败', 'error');
        return { success: false, error };
    }
}



// 更新UI状态
function updateUIForAuth(user) {
    const appContainer = document.getElementById('appContainer');
    const userEmail = document.getElementById('userEmail');

    if (user) {
        // 用户已登录
        appContainer.classList.remove('hidden');
        // 使用authUtils中的方法
        window.authUtils.hideModal('loginModal');
        window.authUtils.hideModal('registerModal');
        if (userEmail) {
            userEmail.textContent = user.email;
        }
    } else {
        // 用户未登录
        appContainer.classList.add('hidden');
        window.authUtils.showModal('loginModal');
    }
}

// 初始化认证
async function initAuth() {
    try {
        // 检查当前登录状态
        const session = await checkAuth();
        if (session) {
            updateUIForAuth(session.user);
        } else {
            updateUIForAuth(null);
        }

        // 监听认证状态变化
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            if (session) {
                updateUIForAuth(session.user);
            } else {
                updateUIForAuth(null);
            }
        });
    } catch (error) {
        console.error('初始化认证失败:', error);
        // 即使出错也显示登录界面
        updateUIForAuth(null);
    }
}

// 绑定事件监听器
function bindAuthEvents() {
    // 登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            const result = await signIn(email, password);
            if (result.success) {
                window.authUtils.hideModal('loginModal');
                loginForm.reset();
            }
        });
    }

    // 注册表单
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // 验证密码
            if (password !== confirmPassword) {
                window.authUtils.showToast('两次输入的密码不一致', 'error');
                return;
            }

            if (password.length < 6) {
                window.authUtils.showToast('密码长度至少6位', 'error');
                return;
            }

            const result = await signUp(email, password);
            if (result.success) {
                window.authUtils.hideModal('registerModal');
                registerForm.reset();
                // 显示提示，需要验证邮箱
                window.authUtils.showModal('loginModal');
            }
        });
    }

    // 显示注册模态框
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            window.authUtils.hideModal('loginModal');
            window.authUtils.showModal('registerModal');
        });
    }

    // 显示登录模态框
    const showLoginBtn = document.getElementById('showLoginBtn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            window.authUtils.hideModal('registerModal');
            window.authUtils.showModal('loginModal');
        });
    }

    // 登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut();
            updateUIForAuth(null);
        });
    }
}

// 显示确认对话框
window.authUtils.showConfirm = (message, title = '确认') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelConfirmBtn');

        if (!modal || !confirmBtn || !cancelBtn) {
            // 如果模态框不存在，回退到原生confirm
            resolve(confirm(message));
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        // 清除旧的事件监听器（通过克隆节点）
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // 绑定新事件
        const handleConfirm = () => {
            modal.classList.remove('show');
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('show');
            resolve(false);
        };

        newConfirmBtn.addEventListener('click', handleConfirm);
        newCancelBtn.addEventListener('click', handleCancel);

        // 显示模态框
        modal.classList.add('show');
    });
};

// 显示Toast提示
window.authUtils.showToast = (message, type = 'info') => {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
};

// 更新authUtils对象，添加所有必要的函数
window.authUtils = {
    ...window.authUtils,
    initAuth,
    bindAuthEvents,
    checkAuth,
    getCurrentUser,
    signUp,
    signIn,
    signOut
};

