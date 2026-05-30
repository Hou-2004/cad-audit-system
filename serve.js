// ============================================================
// CAD 审计系统 - 全栈服务器（Glitch / 云平台部署版）
// 用法: npm start
// 自动检测 PORT 环境变量 (Glitch/Railway/Render 均支持)
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

// ---- 配置 ----
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');
const UPLOAD_DIR = path.join(__dirname, 'server', 'uploads');
const SERVER_DIST = path.join(__dirname, 'server', 'dist');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- 创建 Express 应用 ----
const app = express();

// ============================================================
// 中间件注册
// ============================================================

app.use(require('cors')());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(require('cookie-parser')());

// 静态文件服务 — 前端构建产物
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1y', etag: true, index: false }));
} else {
  console.warn(`[警告] 前端构建产物不存在，请先运行: npm run build:frontend`);
}

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CAD 审计系统', timestamp: new Date().toISOString() });
});

// SPA Fallback：前端路由兜底
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return;
    res.type('html').sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// 后端 API
let apiApp;
try {
  apiApp = require(path.join(SERVER_DIST, 'app')).default || require(path.join(SERVER_DIST, 'app'));
  console.log('[OK] 后端 API 模块加载成功');
} catch (e) {
  console.error('[错误] 后端 API 加载失败:', e.message);
  console.error('[提示] 请确保 server/dist/app.js 存在，运行: npm run build:backend');
  apiApp = express();
}
app.use(apiApp);

// ---- 启动服务 ----
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('  CAD 文件规范审核系统 已启动!');
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  环境: ${process.env.GLITCH ? 'Glitch 云平台' : '本地开发'}`);
  console.log('='.repeat(50));
});

module.exports = { app };
