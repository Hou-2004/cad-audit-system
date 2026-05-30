// ============================================================
// 套餐订阅控制器
// ============================================================

import { Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { AppError } from '../utils/errors';
import { success } from '../utils/response';

export class SubscriptionController {

  // ---- 公开/用户接口 ----

  /** 获取可购买套餐列表 */
  static async getTiers(_req: Request, res: Response): Promise<void> {
    const tiers = await SubscriptionService.getAvailableTiers();
    success(res, tiers);
  }

  /** 获取当前企业套餐状态（管理员查看） */
  static async getSubscriptionStatus(req: any, res: Response): Promise<void> {
    const enterpriseId = req.user.enterpriseId;
    if (!enterpriseId) throw new AppError('您尚未创建或加入企业', 404);

    const status = await SubscriptionService.getEnterpriseSubscriptionStatus(enterpriseId);
    success(res, status);
  }

  /** 获取企业订单列表 */
  static async getOrders(req: any, res: Response): Promise<void> {
    const enterpriseId = req.user.enterpriseId;
    if (!enterpriseId) throw new AppError('您尚未创建或加入企业', 404);

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const result = await SubscriptionService.getEnterpriseOrders(enterpriseId, page, pageSize);
    success(res, result);
  }

  /** 创建订单（购买/续费/升级） */
  static async createOrder(req: any, res: Response): Promise<void> {
    const { tierId, paymentMethod, pointsToUse } = req.body;

    if (!tierId) throw new AppError('请选择套餐', 400);

    const enterpriseId = req.user.enterpriseId;
    if (!enterpriseId) throw new AppError('请先创建企业', 400);

    // 校验支付方式
    const validMethods: string[] = ['points_only', 'cash_only', 'points_cash', 'mock'];
    if (!validMethods.includes(paymentMethod)) throw new AppError('无效的支付方式', 400);

    const order = await SubscriptionService.createOrder(
      req.user.userId,
      enterpriseId,
      parseInt(tierId),
      paymentMethod,
      parseInt(pointsToUse) || 0
    );

    success(res, order, '订单创建成功', 201);
  }

  /** 模拟支付（测试/开发用） */
  static async mockPay(_req: Request, res: Response): Promise<void> {
    const { orderNo } = _req.body;
    if (!orderNo) throw new AppError('缺少订单号', 400);

    const order = await SubscriptionService.mockPay(orderNo);
    success(res, order, '支付成功');
  }

  /** 获取订单详情 */
  static async getOrderDetail(_req: Request, res: Response): Promise<void> {
    const orderId = parseInt(_req.params.id);
    const { SubscriptionRepository } = await import('../repositories/SubscriptionRepository.js');
    const order = await SubscriptionRepository.getOrderById(orderId);
    if (!order) throw new AppError('订单不存在', 404);
    success(res, order);
  }
}
