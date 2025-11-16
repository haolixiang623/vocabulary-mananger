// 用户认证模块
import { supabase } from './supabase-client.js';

// 显示Toast提示
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// 显示模态框
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

// 隐藏模态框
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// 检查登录状态
export async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (error) {
        console.error('Check auth error:', error);
        return null;
    }
}

// 获取当前用户
export async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
}

// 用户注册
export async function signUp(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            showToast('注册成功！请检查邮箱验证链接', 'success');
            return { success: true, user: data.user };
        }

        return { success: false };
    } catch (error) {
        console.error('Sign up error:', error);
        showToast(error.message || '注册失败，请重试', 'error');
        return { success: false, error };
    }
}

// 用户登录
export async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            showToast('登录成功', 'success');
            return { success: true, user: data.user, session: data.session };
        }

        return { success: false };
    } catch (error) {
        console.error('Sign in error:', error);
        showToast(error.message || '登录失败，请检查邮箱和密码', 'error');
        return { success: false, error };
    }
}

// 用户登出
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showToast('已登出', 'info');
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        showToast('登出失败', 'error');
        return { success: false, error };
    }
}

// 更新UI状态
function updateUIForAuth(user) {
    const appContainer = document.getElementById('appContainer');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const userEmail = document.getElementById('userEmail');

    if (user) {
        // 用户已登录
        appContainer.classList.remove('hidden');
        loginModal.classList.remove('show');
        registerModal.classList.remove('show');
        if (userEmail) {
            userEmail.textContent = user.email;
        }
    } else {
        // 用户未登录
        appContainer.classList.add('hidden');
        showModal('loginModal');
    }
}

// 初始化认证
export async function initAuth() {
    // 检查当前登录状态
    const session = await checkAuth();
    if (session) {
        updateUIForAuth(session.user);
    } else {
        updateUIForAuth(null);
    }

    // 监听认证状态变化
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        if (session) {
            updateUIForAuth(session.user);
        } else {
            updateUIForAuth(null);
        }
    });
}

// 绑定事件监听器
export function bindAuthEvents() {
    // 登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            const result = await signIn(email, password);
            if (result.success) {
                hideModal('loginModal');
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
                showToast('两次输入的密码不一致', 'error');
                return;
            }

            if (password.length < 6) {
                showToast('密码长度至少6位', 'error');
                return;
            }

            const result = await signUp(email, password);
            if (result.success) {
                hideModal('registerModal');
                registerForm.reset();
                // 显示提示，需要验证邮箱
                showModal('loginModal');
            }
        });
    }

    // 显示注册模态框
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            hideModal('loginModal');
            showModal('registerModal');
        });
    }

    // 显示登录模态框
    const showLoginBtn = document.getElementById('showLoginBtn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            hideModal('registerModal');
            showModal('loginModal');
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

// 导出showToast供其他模块使用
export { showToast, showModal, hideModal };

