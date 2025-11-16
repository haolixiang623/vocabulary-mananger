// Supabase客户端配置 - 修改为全局变量方式，支持直接文件访问

// 从全局window对象获取Supabase（通过CDN加载）
// 确保Supabase已加载
function getSupabaseClient() {
    // 获取全局配置
    const CONFIG = window.APP_CONFIG || {};
    
    // 检查Supabase是否已加载
    if (!window.supabase || !window.supabase.createClient) {
        console.error('Supabase未加载，请确保在HTML中引入Supabase CDN脚本');
        // 返回一个占位对象，避免立即崩溃
        return {
            auth: {
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                getUser: () => Promise.resolve({ data: { user: null }, error: null }),
                signUp: () => Promise.resolve({ data: null, error: new Error('Supabase未加载') }),
                signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase未加载') }),
                signOut: () => Promise.resolve({ error: new Error('Supabase未加载') }),
                onAuthStateChange: () => ({ data: { subscription: null } })
            },
            from: () => ({
                select: () => ({ eq: () => ({ data: [], error: new Error('Supabase未加载') }) }),
                insert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error('Supabase未加载') }) }) }),
                update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: new Error('Supabase未加载') }) }) }) }),
                delete: () => ({ eq: () => ({ error: new Error('Supabase未加载') }) })
            })
        };
    }
    return window.supabase.createClient(
        CONFIG.SUPABASE_URL || '',
        CONFIG.SUPABASE_ANON_KEY || ''
    );
}

// 创建Supabase客户端实例并存储到全局
window.supabaseClient = getSupabaseClient();

// 移除重复声明，所有文件应直接使用window.supabaseClient

