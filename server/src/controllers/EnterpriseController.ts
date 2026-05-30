// ============================================================
// 企业管理控制器
// ============================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { EnterpriseService } from '../services/EnterpriseService.js';
import { success, paginated } from '../utils/response.js';

export class EnterpriseController {
  // 创建企业
  static async create(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ code: 400, message: '企业名称不能为空', data: null }); return; }
    try {
      const result = await EnterpriseService.createEnterprise(userId, name, description);
      success(res, result, '企业创建成功', 201);
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 获取企业详情
  static async getDetail(req: Request, res: Response): Promise<void> {
    try {
      const enterpriseId = parseInt(req.params.id);
      const user = (req as any).user;
      const result = await EnterpriseService.getEnterpriseDetail(enterpriseId, user?.role, user?.userId);
      success(res, result);
    } catch (err: any) {
      res.status(404).json({ code: 404, message: err.message, data: null });
    }
  }

  // 获取我的企业（当前用户的企业）
  static async getMyEnterprise(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const { EmployeeRepository } = await import('../repositories/EmployeeRepository.js');
    const emp = await EmployeeRepository.findByUserId(userId);
    if (emp) {
      const result = await EnterpriseService.getEnterpriseDetail(emp.enterprise_id);
      success(res, result);
    } else {
      success(res, null);
    }
  }

  // 绑定员工
  static async bindEmployee(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt(req.params.enterpriseId);
    const { account } = req.body; // 邮箱或手机号
    if (!account) { res.status(400).json({ code: 400, message: '请提供用户邮箱或手机号', data: null }); return; }
    try {
      const result = await EnterpriseService.bindEmployee(enterpriseId, adminId, account);
      success(res, result, '绑定成功');
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 踢出员工
  static async removeEmployee(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt(req.params.enterpriseId);
    const employeeUserId = parseInt(req.params.userId);
    try {
      await EnterpriseService.removeEmployee(enterpriseId, adminId, employeeUserId);
      success(res, null, '已移除该员工');
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 提升为管理员
  static async promoteAdmin(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt(req.params.enterpriseId);
    const targetUserId = parseInt(req.params.userId);
    try {
      await EnterpriseService.promoteToAdmin(enterpriseId, adminId, targetUserId);
      success(res, null, '已提升为管理员');
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 直接注册新员工
  static async directRegister(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt(req.params.enterpriseId);
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      res.status(400).json({ code: 400, message: '请填写完整信息', data: null }); return;
    }
    try {
      const user = await EnterpriseService.directRegisterEmployee(enterpriseId, adminId, { email, username, password });
      const { password: _p, ...userInfo } = user;
      success(res, userInfo, '员工注册成功', 201);
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 兑换员工名额
  static async exchangeSlots(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt(req.params.enterpriseId);
    const { count } = req.body;
    if (!count || count < 1) { res.status(400).json({ code: 400, message: '数量需大于0', data: null }); return; }
    try {
      await EnterpriseService.exchangeEmployeeSlots(enterpriseId, adminId, Math.floor(count));
      success(res, null, `成功兑换 ${count} 个员工注册名额`);
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 获取员工列表
  static async getEmployees(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt(req.params.enterpriseId);
    try {
      const employees = await EnterpriseService.getEmployees(enterpriseId, adminId);
      success(res, employees);
    } catch (err: any) {
      res.status(403).json({ code: 403, message: err.message, data: null });
    }
  }
}
