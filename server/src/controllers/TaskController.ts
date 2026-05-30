// ============================================================
// 任务管理控制器
// ============================================================

import { Request, Response } from 'express';
import { TaskService } from '../services/TaskService.js';
import { success, paginated } from '../utils/response.js';

export class TaskController {
  // 创建任务
  static async create(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt((req as any).user?.enterpriseId || req.body.enterprise_id || req.params.enterpriseId);
    if (!enterpriseId) {
      res.status(400).json({ code: 400, message: '缺少企业ID', data: null }); return;
    }

    try {
      const taskId = await TaskService.createTask(adminId, enterpriseId, {
        title: req.body.title,
        description: req.body.description,
        spec_requirements: req.body.spec_requirements,
        selected_rule_ids: req.body.selected_rule_ids,
        target_user_ids: req.body.target_user_ids,
        priority: req.body.priority || 'medium',
        deadline: req.body.deadline,
      });
      success(res, { id: taskId }, '任务创建成功', 201);
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 更新任务
  static async update(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const taskId = parseInt(req.params.id);
    try {
      await TaskService.updateTask(taskId, adminId, req.body);
      success(res, null, '任务更新成功');
    } catch (err: any) {
      const code = err.message.includes('不存在') ? 404 : err.message.includes('无权') ? 403 : 400;
      res.status(code).json({ code, message: err.message, data: null });
    }
  }

  // 删除任务
  static async delete(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const taskId = parseInt(req.params.id);
    try {
      await TaskService.deleteTask(taskId, adminId);
      success(res, null, '任务已删除');
    } catch (err: any) {
      res.status(err.message.includes('无权') ? 403 : 404).json({ code: 404, message: err.message, data: null });
    }
  }

  // 企业任务列表（管理员）
  static async listEnterpriseTasks(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.userId;
    const enterpriseId = parseInt(req.params.enterpriseId);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

    try {
      const result = await TaskService.getEnterpriseTasks(enterpriseId, adminId, page, pageSize, req.query.status as string | undefined);
      paginated(res, result.list, result.total, page, pageSize);
    } catch (err: any) {
      res.status(403).json({ code: 403, message: err.message, data: null });
    }
  }

  // 我的任务列表（员工）
  static async listMyTasks(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

    const tasks = await TaskService.getUserTasks(userId, page, pageSize);
    success(res, tasks);
  }

  // 更新任务分配状态（员工完成/跳过）
  static async updateStatus(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const taskId = parseInt(req.params.id);
    const { status, notes } = req.body;
    if (!status) { res.status(400).json({ code: 400, message: '缺少状态参数', data: null }); return; }
    try {
      await TaskService.updateAssignmentStatus(taskId, userId, status, notes);
      success(res, null, '状态已更新');
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }
}
