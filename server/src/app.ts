// ============================================================
// 应用入口 - CAD 文件规范审核系统
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { testConnection, closePool } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// ============================================================
// 基础中间件
// ============================================================

// 安全头（helmet）
app.use(helmet({
  contentSecurityPolicy: config.isDev ? false : undefined,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 请求日志（开发模式）
if (config.isDev) {
  app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    if (Object.keys(req.body || {}).length > 0 && req.path !== '/auth/login') {
      console.log(`  Body: ${JSON.stringify(req.body).substring(0, 200)}`);
    }
    next();
  });
}

// 全局速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: config.isDev ? 1000 : 200,
  message: { code: 429, message: '请求过于频繁，请稍后再试', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 认证接口更严格的限流
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 每分钟20次登录/注册尝试
  message: { code: 429, message: '操作过于频繁，请稍后再试', data: null },
});
app.use('/api/auth', authLimiter);

// ============================================================
// 静态文件服务（上传的文件和报告）
// ============================================================
app.use('/uploads', express.static(config.upload.dir, {
  setHeaders(res, filePath) {
    // 根据文件类型设置 Content-Disposition
    if (filePath.endsWith('.json')) res.set('Content-Type', 'application/json');
  },
  maxAge: '1h',
}));

// ============================================================
// API 路由
// ============================================================
app.use('/api', routes);

// ============================================================
// 404 处理
// ============================================================
app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
    timestamp: Date.now(),
  });
});

// ============================================================
// 全局错误处理
// ============================================================
app.use(errorHandler);

// ============================================================
// 启动服务器
// ============================================================
async function main() {
  try {
    // 测试数据库连接
    await testConnection();

    // 启动定时任务：每日重置免费次数
    startDailyResetScheduler();

    const server = app.listen(config.port, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║   CAD 文件规范审核系统 - 后端服务已启动     ║');
      console.log(`║   地址: http://localhost:${String(config.port).padEnd(28)}║`);
      console.log(`║   环境: ${(config.nodeEnv + '').padEnd(32)}║`);
      console.log(`║   API:  http://localhost:${config.port}/api${' '.repeat(24 - String(config.port).length)}║`);
      console.log('╚════════════════════════════════════════════╝');
      console.log('');

      console.log('[API] 主要端点:');
      console.log('  POST /api/auth/register       - 注册');
      console.log('  POST /api/auth/login          - 登录');
      console.log('  GET  /api/user/me             - 获取当前用户');
      console.log('  POST /api/audit/upload        - 上传CAD审核');
      console.log('  GET  /api/audit/history       - 审核历史');
      console.log('  POST /api/enterprise          - 创建企业');
      console.log('  GET  /api/subscription/tiers  - 套餐列表');
      console.log('  POST /api/subscription/orders - 购买/续费/升级套餐');
      console.log('  GET  /api/ads                 - 获取广告');
      console.log('  GET  /health                  - 健康检查');
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      console.log('\n[系统] 收到 SIGTERM，正在优雅关闭...');
      server.close(async () => {
        console.log('[系统] HTTP 服务已停止');
        await closePool();
        process.exit(0);
      });

      // 强制退出超时
      setTimeout(() => process.exit(1), 10000);
    });

    process.on('SIGINT', async () => {
      console.log('\n[系统] 收到 SIGINT (Ctrl+C)');
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('[启动失败]', error);
    process.exit(1);
  }
}

/**
 * 定时任务调度器 - 每日重置免费审核次数
 */
function startDailyResetScheduler(): void {
  // 计算到下一个凌晨0点的时间间隔
  function scheduleNextReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 5, 0); // 00:00:05 触发

    const delay = tomorrow.getTime() - now.getTime();
    console.log(`[定时器] 下次每日重置将在 ${new Date(tomorrow).toLocaleString()} 执行`);

    setTimeout(async () => {
      try {
        const { UserRepository } = await import('./repositories/UserRepository.js');
        await UserRepository.resetDailyFreeCounts();
        console.log(`[${new Date().toISOString()}] [定时器] 已完成每日免费审核次数重置`);

        // ★ 套餐相关定时任务：重置任务下发计数 + 冻结过期企业
        const { SubscriptionService } = await import('./services/SubscriptionService.js');
        const subResult = await SubscriptionService.dailyReset();
        console.log(`[${new Date().toISOString()}] [定时器] 套餐: 重置${subResult.enterprisesReset}家企业任务计数, 冻结${subResult.frozenCount}家过期企业`);

        // ★ 续费提醒（7天内到期）
        const expiring = await SubscriptionService.getExpiringEnterprises(7);
        if (expiring.length > 0) {
          console.log(`[${new Date().toISOString()}] [提醒] ${expiring.length} 家企业将在7天内到期，建议通知续费`);
          // TODO: 可接入邮件/短信通知服务
        }

        // 安排下一次
        scheduleNextReset();
      } catch (err) {
        console.error('[定时器] 重置失败:', err);
        scheduleNextReset(); // 即使失败也继续调度
      }
    }, delay);
  }

  scheduleNextReset();
}

// 只在直接运行时启动服务器（被导入为模块时跳过）
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

export default app;
