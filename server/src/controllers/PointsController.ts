// ============================================================
// 积分与充值控制器
// ============================================================

import { Request, Response } from 'express';
import { PointsService } from '../services/PointsService.js';
import { success, paginated } from '../utils/response.js';

export class PointsController {
  // 充值
  static async recharge(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const { amount, payment_method } = req.body;

    if (!amount || amount < 1) {
      res.status(400).json({ code: 400, message: '充值金额需大于0', data: null });
      return;
    }

    try {
      const record = await PointsService.recharge(userId, amount, payment_method || 'mock');
      success(res, record, '充值成功');
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 获取积分信息（余额、免费次数）
  static async getInfo(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    try {
      const info = await PointsService.getPointsInfo(userId);
      success(res, info);
    } catch (err: any) {
      res.status(500).json({ code: 500, message: err.message, data: null });
    }
  }

  // 积分流水
  static async getRecords(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 50);

    const result = await PointsService.getPointRecords(userId, page, pageSize);
    paginated(res, result.list, result.total, page, pageSize);
  }

  // 充值记录
  static async getRechargeHistory(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 50);

    const result = await PointsService.getRechargeRecords(userId, page, pageSize);
    paginated(res, result.list, result.total, page, pageSize);
  }
}
