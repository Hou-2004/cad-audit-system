// ============================================================
// 全栈一体化服务器 —— 前端 + 后端 + 数据库，一个进程搞定
// 用法: node serve.js
// 部署: 整个 server 目录上传到任何 Node.js 环境即可 24/7 运行
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

// ---- 配置 ----
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- 创建 Express 应用 ----
const app = express();

// ============================================================
// 中间件注册（顺序很重要！）
// ============================================================

// 1️⃣ 基础中间件
app.use(require('cors')());
app.use(require('helmet')({ contentSecurityPolicy: false }));
app.use(require('cookie-parser')());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 2️⃣ 静态文件服务（前端构建产物）— 必须在 API 之前
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1y', etag: true, index: false }));
} else {
  console.warn(`[警告] 前端构建产物不存在: ${CLIENT_DIST}`);
}

// 3️⃣ 健康检查端点 — 必须在 API 之前
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CAD 审计系统全栈服务',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

// 4️⃣ SPA Fallback：前端路由兜底 — 必须在 API 之前
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.get('*', (req, res) => {
    // 排除 API 和上传路径
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return;
    res.type('html').sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// 5️⃣ 后端 API（最后挂载，只处理 /api/* 开头的请求）
let apiApp;
try {
  apiApp = require('./dist/app').default || require('./dist/app');
  console.log('[后端] API 模块加载成功');
} catch (e) {
  console.error('[错误] 后端 API 加载失败:', e.message);
  apiApp = express();
}
app.use(apiApp);

// ============================================================
// 启动服务
// ============================================================
const server = app.listen(PORT, () => {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  console.log('');
  console.log('='.repeat(58));
  console.log('  CAD 文件规范审核系统 — 全栈服务器已启动');
  console.log(`  启动时间: ${now}`);
  console.log('  ' + '='.repeat(56));
  console.log('');
  console.log(`  本地访问:   http://localhost:${PORT}`);
  console.log(`  API 地址:   http://localhost:${PORT}/api`);
  console.log(`  健康检查:   http://localhost:${PORT}/health`);
  console.log('  ' + '-'.repeat(56));
  console.log('');
  console.log('  内置账号 (密码统一为 Cad@2026):');
  console.log('  +-- 管理员: admin@cad-audit.com');
  console.log('  +-- 工作者: worker1@cad-audit.com (张三)');
  console.log('  +-- 工作者: worker2@cad-audit.com (李四)');
  console.log('  +-- 工作者: worker3@cad-audit.com (王五)');
  console.log('  ' + '-'.repeat(56));
  console.log('  数据存储: 内存数据库 (data/memory-db.json)');
  console.log('='.repeat(58));
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n[系统] 收到 SIGTERM，正在关闭...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
});
process.on('SIGINT', () => {
  console.log('\n[系统] 收到 Ctrl+C，再见！');
  server.close(() => process.exit(0));
});

module.exports = { app, server };
