"use strict";
// ============================================================
// 路由定义
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const upload_js_1 = require("../middleware/upload.js");
const AuthController_js_1 = require("../controllers/AuthController.js");
const UserController_js_1 = require("../controllers/UserController.js");
const EnterpriseController_js_1 = require("../controllers/EnterpriseController.js");
const TaskController_js_1 = require("../controllers/TaskController.js");
const AuditController_js_1 = require("../controllers/AuditController.js");
const PointsController_js_1 = require("../controllers/PointsController.js");
const AdController_js_1 = require("../controllers/AdController.js");
const SubscriptionController_js_1 = require("../controllers/SubscriptionController.js");
const router = (0, express_1.Router)();
// ============================================================
// 公开接口（无需登录）
// ============================================================
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
// 广告（公开）
router.get('/ads', AdController_js_1.AdController.getAll);
router.get('/ads/position/:position', AdController_js_1.AdController.getByPosition);
router.post('/ads/:id/click', AdController_js_1.AdController.click);
// 审核规则库（公开-预设）
router.get('/rules/preset', async (req, res) => {
    const { AuditRuleRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/AuditRuleRepository.js')));
    const rules = await AuditRuleRepository.findPreset();
    res.json(rules);
});
// ============================================================
// 认证相关
// ============================================================
const authRouter = (0, express_1.Router)();
authRouter.post('/register', (req, res) => AuthController_js_1.AuthController.register(req, res));
authRouter.post('/login', (req, res) => AuthController_js_1.AuthController.login(req, res));
authRouter.post('/refresh', (req, res) => AuthController_js_1.AuthController.refresh(req, res));
authRouter.post('/logout', auth_js_1.authenticate, (req, res) => AuthController_js_1.AuthController.logout(req, res));
router.use('/auth', authRouter);
// ============================================================
// 需要认证的接口
// ============================================================
const protectedRouter = (0, express_1.Router)();
protectedRouter.use(auth_js_1.authenticate);
// --- 用户 ---
protectedRouter.get('/user/me', (req, res) => UserController_js_1.UserController.me(req, res));
protectedRouter.put('/user/me', (req, res) => UserController_js_1.UserController.updateMe(req, res));
// --- 积分与充值 ---
protectedRouter.get('/points/info', (req, res) => PointsController_js_1.PointsController.getInfo(req, res));
protectedRouter.post('/points/recharge', (req, res) => PointsController_js_1.PointsController.recharge(req, res));
protectedRouter.get('/points/records', (req, res) => PointsController_js_1.PointsController.getRecords(req, res));
protectedRouter.get('/points/recharges', (req, res) => PointsController_js_1.PointsController.getRechargeHistory(req, res));
// --- CAD 审核 ---
protectedRouter.post('/audit/upload', upload_js_1.upload.single('file'), (req, res) => AuditController_js_1.AuditController.uploadAndAudit(req, res));
protectedRouter.get('/audit/history', (req, res) => AuditController_js_1.AuditController.getHistory(req, res));
protectedRouter.get('/audit/:id', (req, res) => AuditController_js_1.AuditController.getDetail(req, res));
// --- 企业管理 ---
protectedRouter.post('/enterprise', (req, res) => EnterpriseController_js_1.EnterpriseController.create(req, res));
protectedRouter.get('/enterprise/my', (req, res) => EnterpriseController_js_1.EnterpriseController.getMyEnterprise(req, res));
protectedRouter.get('/enterprise/:id', (req, res) => EnterpriseController_js_1.EnterpriseController.getDetail(req, res));
protectedRouter.post('/enterprise/:enterpriseId/employees/bind', (req, res) => EnterpriseController_js_1.EnterpriseController.bindEmployee(req, res));
protectedRouter.delete('/enterprise/:enterpriseId/employees/:userId', (req, res) => EnterpriseController_js_1.EnterpriseController.removeEmployee(req, res));
protectedRouter.put('/enterprise/:enterpriseId/employees/:userId/promote', (req, res) => EnterpriseController_js_1.EnterpriseController.promoteAdmin(req, res));
protectedRouter.get('/enterprise/:enterpriseId/employees', (req, res) => EnterpriseController_js_1.EnterpriseController.getEmployees(req, res));
protectedRouter.post('/enterprise/:enterpriseId/employees/register', (req, res) => EnterpriseController_js_1.EnterpriseController.directRegister(req, res));
protectedRouter.post('/enterprise/:enterpriseId/exchange-slots', (req, res) => EnterpriseController_js_1.EnterpriseController.exchangeSlots(req, res));
// --- 套餐订阅 ---
protectedRouter.get('/subscription/tiers', (req, res) => SubscriptionController_js_1.SubscriptionController.getTiers(req, res));
protectedRouter.get('/subscription/status', (req, res) => SubscriptionController_js_1.SubscriptionController.getSubscriptionStatus(req, res));
protectedRouter.get('/subscription/orders', (req, res) => SubscriptionController_js_1.SubscriptionController.getOrders(req, res));
protectedRouter.post('/subscription/orders', (req, res) => SubscriptionController_js_1.SubscriptionController.createOrder(req, res));
protectedRouter.post('/subscription/mock-pay', (req, res) => SubscriptionController_js_1.SubscriptionController.mockPay(req, res));
protectedRouter.get('/subscription/orders/:id', (req, res) => SubscriptionController_js_1.SubscriptionController.getOrderDetail(req, res));
// --- 任务管理 ---
protectedRouter.post('/tasks', (req, res) => TaskController_js_1.TaskController.create(req, res));
protectedRouter.put('/tasks/:id', (req, res) => TaskController_js_1.TaskController.update(req, res));
protectedRouter.delete('/tasks/:id', (req, res) => TaskController_js_1.TaskController.delete(req, res));
protectedRouter.get('/tasks/mine', (req, res) => TaskController_js_1.TaskController.listMyTasks(req, res));
protectedRouter.get('/tasks/:id/status', (req, res) => TaskController_js_1.TaskController.updateStatus(req, res));
protectedRouter.get('/enterprise/:enterpriseId/tasks', (req, res) => TaskController_js_1.TaskController.listEnterpriseTasks(req, res));
protectedRouter.post('/tasks/:taskId/audit', upload_js_1.upload.single('file'), (req, res) => AuditController_js_1.AuditController.auditTaskFile(req, res));
// ============================================================
// 超级管理员接口
// ============================================================
const adminRouter = (0, express_1.Router)();
adminRouter.use(auth_js_1.authenticate, (0, auth_js_1.authorize)('super_admin'));
// 用户管理
adminRouter.get('/admin/users', (req, res) => UserController_js_1.UserController.list(req, res));
adminRouter.patch('/admin/users/:id/status', (req, res) => UserController_js_1.UserController.toggleStatus(req, res));
adminRouter.post('/admin/users/:id/points', (req, res) => UserController_js_1.UserController.adjustPoints(req, res));
// 广告管理
adminRouter.post('/admin/ads', upload_js_1.uploadAdImage.single('image'), (req, res) => AdController_js_1.AdController.create(req, res));
adminRouter.put('/admin/ads/:id', (req, res) => AdController_js_1.AdController.update(req, res));
adminRouter.delete('/admin/ads/:id', (req, res) => AdController_js_1.AdController.delete(req, res));
adminRouter.get('/admin/ads', (req, res) => AdController_js_1.AdController.list(req, res));
router.use(adminRouter);
// 挂载所有受保护路由
router.use(protectedRouter);
exports.default = router;
