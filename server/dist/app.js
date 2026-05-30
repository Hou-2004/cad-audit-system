"use strict";
// ============================================================
// 应用入口 - CAD 文件规范审核系统
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = __importDefault(require("./config/index.js"));
const database_js_1 = require("./config/database.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const index_js_2 = __importDefault(require("./routes/index.js"));
const app = (0, express_1.default)();
// ============================================================
// 基础中间件
// ============================================================
// 安全头（helmet）
app.use((0, helmet_1.default)({
    contentSecurityPolicy: index_js_1.default.isDev ? false : undefined,
    crossOriginEmbedderPolicy: false,
}));
// CORS
app.use((0, cors_1.default)({
    origin: [index_js_1.default.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
// 解析请求体
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// 请求日志（开发模式）
if (index_js_1.default.isDev) {
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
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: index_js_1.default.isDev ? 1000 : 200,
    message: { code: 429, message: '请求过于频繁，请稍后再试', data: null },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// 认证接口更严格的限流
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20, // 每分钟20次登录/注册尝试
    message: { code: 429, message: '操作过于频繁，请稍后再试', data: null },
});
app.use('/api/auth', authLimiter);
// ============================================================
// 静态文件服务（上传的文件和报告）
// ============================================================
app.use('/uploads', express_1.default.static(index_js_1.default.upload.dir, {
    setHeaders(res, filePath) {
        // 根据文件类型设置 Content-Disposition
        if (filePath.endsWith('.json'))
            res.set('Content-Type', 'application/json');
    },
    maxAge: '1h',
}));
// ============================================================
// API 路由
// ============================================================
app.use('/api', index_js_2.default);
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
app.use(errorHandler_js_1.errorHandler);
// ============================================================
// 启动服务器
// ============================================================
async function main() {
    try {
        // 测试数据库连接
        await (0, database_js_1.testConnection)();
        // 启动定时任务：每日重置免费次数
        startDailyResetScheduler();
        const server = app.listen(index_js_1.default.port, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════╗');
            console.log('║   CAD 文件规范审核系统 - 后端服务已启动     ║');
            console.log(`║   地址: http://localhost:${String(index_js_1.default.port).padEnd(28)}║`);
            console.log(`║   环境: ${(index_js_1.default.nodeEnv + '').padEnd(32)}║`);
            console.log(`║   API:  http://localhost:${index_js_1.default.port}/api${' '.repeat(24 - String(index_js_1.default.port).length)}║`);
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
                await (0, database_js_1.closePool)();
                process.exit(0);
            });
            // 强制退出超时
            setTimeout(() => process.exit(1), 10000);
        });
        process.on('SIGINT', async () => {
            console.log('\n[系统] 收到 SIGINT (Ctrl+C)');
            server.close(async () => {
                await (0, database_js_1.closePool)();
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('[启动失败]', error);
        process.exit(1);
    }
}
/**
 * 定时任务调度器 - 每日重置免费审核次数
 */
function startDailyResetScheduler() {
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
                const { UserRepository } = await Promise.resolve().then(() => __importStar(require('./repositories/UserRepository.js')));
                await UserRepository.resetDailyFreeCounts();
                console.log(`[${new Date().toISOString()}] [定时器] 已完成每日免费审核次数重置`);
                // ★ 套餐相关定时任务：重置任务下发计数 + 冻结过期企业
                const { SubscriptionService } = await Promise.resolve().then(() => __importStar(require('./services/SubscriptionService.js')));
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
            }
            catch (err) {
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
exports.default = app;
