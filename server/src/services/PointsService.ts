// ============================================================
// 积分与充值服务
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { PointRecordRepository } from '../repositories/PointRecordRepository.js';
import { RechargeRecordRepository } from '../repositories/RechargeRecordRepository.js';

export class PointsService {

  /**
   * 充值（模拟支付）
   */
  static async recharge(userId: number, amount: number, paymentMethod: string): Promise<any> {
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('用户不存在');

    // 金额校验
    if (amount < 1 || amount > 10000) {
      throw new Error('充值金额需在 1-10000 元之间');
    }

    // 创建充值记录
    const pointsGranted = Math.floor(amount); // 1元 = 1积分
    const tradeNo = config.paymentMode === 'mock'
      ? `MOCK_${uuidv4().replace(/-/g, '').toUpperCase().substring(0, 24)}`
      : null;

    const recordId = await RechargeRecordRepository.create({
      user_id: userId,
      amount: Number(amount.toFixed(2)),
      points_granted: pointsGranted,
      payment_method: paymentMethod || 'mock',
      trade_no: tradeNo,
    });

    // 模拟支付成功
    if (config.paymentMode === 'mock') {
      // 模拟延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 更新充值状态为已支付
      await RechargeRecordRepository.updateStatus(recordId, 'paid');

      // 增加用户积分
      const balanceAfter = await UserRepository.addPoints(userId, pointsGranted);

      // 记录积分变动
      await PointRecordRepository.create({
        user_id: userId,
        amount: pointsGranted,
        type: 'recharge',
        description: `在线充值 ¥${amount}`,
        related_id: recordId,
        balance_after: balanceAfter,
      });
    }

    return await RechargeRecordRepository.findById(recordId);
  }

  /**
   * 获取用户积分余额和审核次数信息
   */
  static async getPointsInfo(userId: number): Promise<{
    balance: number;
    freeAuditDaily: number;
    freeAuditUsed: number;
    freeAuditRemaining: number;
  }> {
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('用户不存在');

    // 如果跨天，重置免费次数
    if (user.free_audit_reset_date < new Date().toISOString().split('T')[0]) {
      await UserRepository.update(user.id, { free_audit_count_used: 0, free_audit_reset_date: new Date().toISOString().split('T')[0] });
      return {
        balance: user.points,
        freeAuditDaily: user.free_audit_count_daily,
        freeAuditUsed: 0,
        freeAuditRemaining: user.free_audit_count_daily,
      };
    }

    return {
      balance: user.points,
      freeAuditDaily: user.free_audit_count_daily,
      freeAuditUsed: user.free_audit_count_used,
      freeAuditRemaining: Math.max(0, user.free_audit_count_daily - user.free_audit_count_used),
    };
  }

  /**
   * 获取积分流水记录
   */
  static async getPointRecords(userId: number, page: number, pageSize: number): Promise<any> {
    return await PointRecordRepository.findByUserId(userId, page, pageSize);
  }

  /**
   * 获取充值记录
   */
  static async getRechargeRecords(userId: number, page: number, pageSize: number): Promise<any> {
    return await RechargeRecordRepository.findByUserId(userId, page, pageSize);
  }
}
