// Supabase客户端配置
import { CONFIG } from './config.js';

// 从全局window对象获取Supabase（通过CDN加载）
const { createClient } = window.supabase;

// 创建Supabase客户端实例
export const supabase = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
);

// 导出客户端供其他模块使用
export default supabase;

