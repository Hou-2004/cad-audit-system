// ============================================================
// 用户管理控制器（超管）
// ============================================================

import { Request, Response } from 'express';
import { UserRepository } from '../repositories/UserRepository.js';
import { success, paginated } from '../utils/response.js';

export class UserController {
  // 获取当前用户信息
  static async me(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const user = await UserRepository.findById(userId);
    if (!user) { res.status(404).json({ code: 404, message: '用户不存在', data: null }); return; }

    // 不返回密码
    const { password: _p, ...userInfo } = user;

    // 附加企业信息
    try {
      const { EmployeeRepository } = await import('../repositories/EmployeeRepository.js');
      const emp = await EmployeeRepository.findByUserId(userId);
      if (emp) {
        (userInfo as any).enterprise_id = emp.enterprise_id;
        (userInfo as any).is_enterprise_admin = emp.is_admin;
        const { EnterpriseRepository } = await import('../repositories/EnterpriseRepository.js');
        const ent = await EnterpriseRepository.findById(emp.enterprise_id);
        if (ent) (userInfo as any).enterprise_name = ent.name;
      }
    } catch {}

    success(res, userInfo);
  }

  // 更新当前用户信息
  static async updateMe(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const allowedFields = ['username', 'avatar'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ code: 400, message: '没有可更新的字段', data: null }); return;
    }

    await UserRepository.update(userId, updateData);
    const user = await UserRepository.findById(userId);
    const { password: _p, ...userInfo } = user!;
    success(res, userInfo, '更新成功');
  }

  // 用户列表（超管）
  static async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 100);

    const filters: any = {};
    if (req.query.role) filters.role = req.query.role;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.keyword) filters.keyword = req.query.keyword;

    const result = await UserRepository.findAll(page, pageSize, filters);
    result.list.forEach((u: any) => delete u.password);

    paginated(res, result.list, result.total, page, pageSize);
  }

  // 禁用/启用用户（超管）
  static async toggleStatus(req: Request, res: Response): Promise<void> {
    const targetId = parseInt(req.params.id);
    const newStatus = req.body.status === 'disabled' ? 'disabled' : 'active';

    const user = await UserRepository.findById(targetId);
    if (!user) { res.status(404).json({ code: 404, message: '用户不存在', data: null }); return; }
    if (user.role === 'super_admin') {
      res.status(403).json({ code: 403, message: '不能操作超级管理员', data: null }); return;
    }

    await UserRepository.update(targetId, { status: newStatus });
    success(res, null, `用户已${newStatus === 'disabled' ? '禁用' : '启用'}`);
  }

  // 调整积分（超管）
  static async adjustPoints(req: Request, res: Response): Promise<void> {
    const targetId = parseInt(req.params.id);
    const amount = parseInt(req.body.amount); // 正=增加，负=扣减
    const reason = req.body.reason || '管理员调整';

    if (!amount || amount === 0) {
      res.status(400).json({ code: 400, message: '请输入有效的积分数额', data: null }); return;
    }

    const user = await UserRepository.findById(targetId);
    if (!user) { res.status(404).json({ code: 404, message: '用户不存在', data: null }); return; }

    let balanceAfter: number;
    if (amount > 0) {
      balanceAfter = await UserRepository.addPoints(targetId, amount);
    } else {
      try {
        balanceAfter = await UserRepository.deductPoints(targetId, Math.abs(amount));
      } catch (err: any) {
        res.status(400).json({ code: 400, message: err.message, data: null }); return;
      }
    }

    // 记录
    const { PointRecordRepository } = await import('../repositories/PointRecordRepository.js');
    await PointRecordRepository.create({
      user_id: targetId,
      amount,
      type: 'admin_adjust',
      description: reason,
      balance_after: balanceAfter,
    });

    success(res, { balanceAfter }, '积分调整成功');
  }
}
