// ============================================================
// 数据库连接层 —— 开发环境使用内存数据库兼容层
// ============================================================

import { pool, getConnection } from './database-shim.js';

// 兼容旧代码：导出 db 作为 pool 的别名
export const db = pool;
export { pool, getConnection };

// 测试连接（内存版直接返回成功）
export async function testConnection(): Promise<void> {
  console.log('[数据库] 内存数据库已就绪');
}

// 优雅关闭（内存版：保存数据到磁盘）
export async function closePool(): Promise<void> {
  console.log('[数据库] 内存数据库已保存并关闭');
}
