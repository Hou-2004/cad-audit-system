// ============================================================
// 路由定义
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { upload, uploadAdImage } from '../middleware/upload.js';
import { AuthController } from '../controllers/AuthController.js';
import { UserController } from '../controllers/UserController.js';
import { EnterpriseController } from '../controllers/EnterpriseController.js';
import { TaskController } from '../controllers/TaskController.js';
import { AuditController } from '../controllers/AuditController.js';
import { PointsController } from '../controllers/PointsController.js';
import { AdController } from '../controllers/AdController.js';
import { SubscriptionController } from '../controllers/SubscriptionController.js';

const router = Router();

// ============================================================
// 公开接口（无需登录）
// ============================================================

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 广告（公开）
router.get('/ads', AdController.getAll);
router.get('/ads/position/:position', AdController.getByPosition);
router.post('/ads/:id/click', AdController.click);

// 审核规则库（公开-预设）
router.get('/rules/preset', async (req, res) => {
  const { AuditRuleRepository } = await import('../repositories/AuditRuleRepository.js');
  const rules = await AuditRuleRepository.findPreset();
  res.json(rules);
});

// ============================================================
// 认证相关
// ============================================================
const authRouter = Router();
authRouter.post('/register', (req, res) => AuthController.register(req, res));
authRouter.post('/login', (req, res) => AuthController.login(req, res));
authRouter.post('/refresh', (req, res) => AuthController.refresh(req, res));
authRouter.post('/logout', authenticate, (req, res) => AuthController.logout(req, res));
router.use('/auth', authRouter);

// ============================================================
// 需要认证的接口
// ============================================================
const protectedRouter = Router();
protectedRouter.use(authenticate);

// --- 用户 ---
protectedRouter.get('/user/me', (req, res) => UserController.me(req, res));
protectedRouter.put('/user/me', (req, res) => UserController.updateMe(req, res));

// --- 积分与充值 ---
protectedRouter.get('/points/info', (req, res) => PointsController.getInfo(req, res));
protectedRouter.post('/points/recharge', (req, res) => PointsController.recharge(req, res));
protectedRouter.get('/points/records', (req, res) => PointsController.getRecords(req, res));
protectedRouter.get('/points/recharges', (req, res) => PointsController.getRechargeHistory(req, res));

// --- CAD 审核 ---
protectedRouter.post('/audit/upload', upload.single('file'), (req, res) => AuditController.uploadAndAudit(req, res));
protectedRouter.get('/audit/history', (req, res) => AuditController.getHistory(req, res));
protectedRouter.get('/audit/:id', (req, res) => AuditController.getDetail(req, res));

// --- 企业管理 ---
protectedRouter.post('/enterprise', (req, res) => EnterpriseController.create(req, res));
protectedRouter.get('/enterprise/my', (req, res) => EnterpriseController.getMyEnterprise(req, res));
protectedRouter.get('/enterprise/:id', (req, res) => EnterpriseController.getDetail(req, res));

protectedRouter.post('/enterprise/:enterpriseId/employees/bind', (req, res) => EnterpriseController.bindEmployee(req, res));
protectedRouter.delete('/enterprise/:enterpriseId/employees/:userId', (req, res) => EnterpriseController.removeEmployee(req, res));
protectedRouter.put('/enterprise/:enterpriseId/employees/:userId/promote', (req, res) => EnterpriseController.promoteAdmin(req, res));
protectedRouter.get('/enterprise/:enterpriseId/employees', (req, res) => EnterpriseController.getEmployees(req, res));
protectedRouter.post('/enterprise/:enterpriseId/employees/register', (req, res) => EnterpriseController.directRegister(req, res));
protectedRouter.post('/enterprise/:enterpriseId/exchange-slots', (req, res) => EnterpriseController.exchangeSlots(req, res));

// --- 套餐订阅 ---
protectedRouter.get('/subscription/tiers', (req, res) => SubscriptionController.getTiers(req, res));
protectedRouter.get('/subscription/status', (req, res) => SubscriptionController.getSubscriptionStatus(req, res));
protectedRouter.get('/subscription/orders', (req, res) => SubscriptionController.getOrders(req, res));
protectedRouter.post('/subscription/orders', (req, res) => SubscriptionController.createOrder(req, res));
protectedRouter.post('/subscription/mock-pay', (req, res) => SubscriptionController.mockPay(req, res));
protectedRouter.get('/subscription/orders/:id', (req, res) => SubscriptionController.getOrderDetail(req, res));

// --- 任务管理 ---
protectedRouter.post('/tasks', (req, res) => TaskController.create(req, res));
protectedRouter.put('/tasks/:id', (req, res) => TaskController.update(req, res));
protectedRouter.delete('/tasks/:id', (req, res) => TaskController.delete(req, res));
protectedRouter.get('/tasks/mine', (req, res) => TaskController.listMyTasks(req, res));
protectedRouter.get('/tasks/:id/status', (req, res) => TaskController.updateStatus(req, res));
protectedRouter.get('/enterprise/:enterpriseId/tasks', (req, res) => TaskController.listEnterpriseTasks(req, res));
protectedRouter.post('/tasks/:taskId/audit', upload.single('file'), (req, res) => AuditController.auditTaskFile(req, res));

// ============================================================
// 超级管理员接口
// ============================================================
const adminRouter = Router();
adminRouter.use(authenticate, authorize('super_admin'));

// 用户管理
adminRouter.get('/admin/users', (req, res) => UserController.list(req, res));
adminRouter.patch('/admin/users/:id/status', (req, res) => UserController.toggleStatus(req, res));
adminRouter.post('/admin/users/:id/points', (req, res) => UserController.adjustPoints(req, res));

// 广告管理
adminRouter.post('/admin/ads', uploadAdImage.single('image'), (req, res) => AdController.create(req, res));
adminRouter.put('/admin/ads/:id', (req, res) => AdController.update(req, res));
adminRouter.delete('/admin/ads/:id', (req, res) => AdController.delete(req, res));
adminRouter.get('/admin/ads', (req, res) => AdController.list(req, res));

router.use(adminRouter);

// 挂载所有受保护路由
router.use(protectedRouter);

export default router;
