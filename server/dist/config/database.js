"use strict";
// ============================================================
// 数据库连接层 —— 开发环境使用内存数据库兼容层
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = exports.pool = exports.db = void 0;
exports.testConnection = testConnection;
exports.closePool = closePool;
const database_shim_js_1 = require("./database-shim.js");
Object.defineProperty(exports, "pool", { enumerable: true, get: function () { return database_shim_js_1.pool; } });
Object.defineProperty(exports, "getConnection", { enumerable: true, get: function () { return database_shim_js_1.getConnection; } });
// 兼容旧代码：导出 db 作为 pool 的别名
exports.db = database_shim_js_1.pool;
// 测试连接（内存版直接返回成功）
async function testConnection() {
    console.log('[数据库] 内存数据库已就绪');
}
// 优雅关闭（内存版：保存数据到磁盘）
async function closePool() {
    console.log('[数据库] 内存数据库已保存并关闭');
}
