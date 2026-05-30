// ============================================================
// CAD 审核控制器
// ============================================================

import { Request, Response } from 'express';
import path from 'path';
import { AuditService } from '../services/AuditService.js';
import { success, paginated } from '../utils/response.js';

export class AuditController {
  // 上传并审核 CAD 文件（工作者）
  static async uploadAndAudit(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const file = req.file;
    if (!file) {
      res.status(400).json({ code: 400, message: '请选择要上传的文件', data: null });
      return;
    }

    try {
      const specRequirements = req.body.spec_requirements
        ? JSON.parse(req.body.spec_requirements)
        : {};
      const ruleIds = req.body.rule_ids
        ? JSON.parse(req.body.rule_ids).map((id: string | number) => parseInt(id))
        : undefined;

      const result = await AuditService.auditFileForWorker(
        userId,
        file.path,
        file.originalname,
        specRequirements,
        ruleIds,
      );
      success(res, { recordId: result.recordId, auditResult: result.result }, '审核完成');
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 员工审核任务关联的CAD文件
  static async auditTaskFile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const taskId = parseInt(req.params.taskId);
    const file = req.file;
    if (!file) {
      res.status(400).json({ code: 400, message: '请选择要上传的文件', data: null }); return;
    }

    try {
      // 获取任务的规范要求
      const { TaskRepository } = await import('../repositories/TaskRepository.js');
      const task = await TaskRepository.findById(taskId);
      if (!task) { res.status(404).json({ code: 404, message: '任务不存在', data: null }); return; }

      const specRequirements = typeof task.spec_requirements === 'string'
        ? JSON.parse(task.spec_requirements)
        : task.spec_requirements;
      const ruleIds = Array.isArray(task.selected_rule_ids) ? task.selected_rule_ids : undefined;

      // 获取用户的企业ID
      const { UserRepository } = await import('../repositories/UserRepository.js');
      const empRel = await UserRepository.findEmployeeRelation(userId);

      const result = await AuditService.auditFileForEmployee(
        userId,
        empRel?.enterprise_id || 0,
        file.path,
        file.originalname,
        specRequirements,
        taskId,
        ruleIds,
      );

      success(res, { recordId: result.recordId, auditResult: result.result }, '审核完成');
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 获取审核详情
  static async getDetail(req: Request, res: Response): Promise<void> {
    const recordId = parseInt(req.params.id);
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    let record;
    if (userRole === 'super_admin') {
      record = await AuditService.getAuditDetail(recordId);
    } else {
      record = await AuditService.getAuditDetail(recordId);
      if (record && record.user_id !== userId) {
        // 检查是否是同企业员工
        const { EmployeeRepository } = await import('../repositories/EmployeeRepository.js');
        const emp = await EmployeeRepository.findByUserId(userId);
        if (!emp || emp.enterprise_id !== record.enterprise_id) {
          res.status(403).json({ code: 403, message: '无权查看此记录', data: null }); return;
        }
      }
    }

    if (!record) {
      res.status(404).json({ code: 404, message: '审核记录不存在', data: null }); return;
    }

    // 解析审核结果JSON
    if (typeof record.audit_result === 'string') {
      record.audit_result = JSON.parse(record.audit_result);
    }
    success(res, record);
  }

  // 审核历史列表
  static async getHistory(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 100);

    const filters: any = { page, pageSize };

    if (userRole !== 'super_admin') {
      filters.user_id = userId;
    } else {
      if (req.query.user_id) filters.user_id = parseInt(req.query.user_id as string);
    }

    if (req.query.status) filters.status = req.query.status;
    if (req.query.keyword) filters.keyword = req.query.keyword;
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;

    const result = await AuditService.getAuditHistory(filters);
    // 解析审核结果
    result.list.forEach((r: any) => {
      if (typeof r.audit_result === 'string' && r.audit_result) r.audit_result = JSON.parse(r.audit_result);
    });

    paginated(res, result.list, result.total, page, pageSize);
  }
}
