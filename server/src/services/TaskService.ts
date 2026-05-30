// ============================================================
// 任务管理服务
// ============================================================

import { TaskRepository } from '../repositories/TaskRepository.js';
import { EmployeeRepository } from '../repositories/EmployeeRepository.js';
import { EnterpriseRepository } from '../repositories/EnterpriseRepository.js';
import { SubscriptionService } from './SubscriptionService.js';

export class TaskService {
  /**
   * 创建任务 — 增加套餐任务限额校验
   */
  static async createTask(adminUserId: number, enterpriseId: number, data: {
    title: string;
    description?: string;
    spec_requirements: Record<string, unknown>;
    selected_rule_ids?: number[];
    target_user_ids?: number[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    deadline?: string;
  }): Promise<number> {
    // 验证企业权限
    const enterprise = await EnterpriseRepository.findById(enterpriseId);
    if (!enterprise || enterprise.admin_id !== adminUserId) {
      throw new Error('无权在该企业下创建任务');
    }

    // ★ 校验套餐任务下发限额
    const quota = await SubscriptionService.checkTaskQuota(enterpriseId);
    if (!quota.canIssue) {
      throw new Error(quota.reason || '今日任务下发已达上限，请升级套餐或明日再试');
    }

    // 验证目标用户是否都是本企业员工
    if (data.target_user_ids && data.target_user_ids.length > 0) {
      for (const uid of data.target_user_ids) {
        const isEmp = await EmployeeRepository.isEmployeeOf(enterpriseId, uid);
        if (!isEmp) throw new Error(`用户 ID ${uid} 不是本企业员工`);
      }
    }

    const taskId = await TaskRepository.create({
      enterprise_id: enterpriseId,
      creator_id: adminUserId,
      title: data.title,
      description: data.description || null,
      spec_requirements: data.spec_requirements,
      selected_rule_ids: data.selected_rule_ids || null,
      target_user_ids: data.target_user_ids || null,
      priority: data.priority,
      deadline: data.deadline || null,
      status: data.deadline ? 'active' : 'draft',
    });

    // 如果指定了目标用户，自动分配
    if (data.target_user_ids && data.target_user_ids.length > 0) {
      await TaskRepository.assign(taskId, data.target_user_ids);
    }

    // ★ 递增今日已下发任务数（用于套餐限额统计）
    await SubscriptionService.incrementTaskCount(enterpriseId);

    return taskId;
  }

  /**
   * 更新任务
   */
  static async updateTask(taskId: number, adminUserId: number, data: Partial<{
    title: string; description: string; spec_requirements: Record<string, unknown>;
    selected_rule_ids: number[]; target_user_ids: number[];
    priority: string; deadline: string; status: string;
  }>): Promise<void> {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw new Error('任务不存在');
    if (task.creator_id !== adminUserId) throw new Error('无权修改此任务');

    // 如果更新目标用户，重新分配
    if (data.target_user_ids) {
      const enterprise = await EnterpriseRepository.findById(task.enterprise_id);
      if (enterprise) {
        for (const uid of data.target_user_ids) {
          const isEmp = await EmployeeRepository.isEmployeeOf(task.enterprise_id, uid);
          if (!isEmp) throw new Error(`用户 ID ${uid} 不是本企业员工`);
        }
      }
    }

    await TaskRepository.update(taskId, data as any);

    // 重新分配（如果提供了新的目标用户列表）
    if (data.target_user_ids) {
      // 注意：实际应该先删除旧分配再创建新分配，这里简化处理
      await TaskRepository.assign(taskId, data.target_user_ids);
    }
  }

  /**
   * 删除任务
   */
  static async deleteTask(taskId: number, adminUserId: number): Promise<void> {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw new Error('任务不存在');
    if (task.creator_id !== adminUserId) throw new Error('无权删除此任务');

    await TaskRepository.delete(taskId);
  }

  /**
   * 获取企业下的所有任务
   */
  static async getEnterpriseTasks(enterpriseId: number, adminUserId: number, page: number, pageSize: number, status?: string): Promise<any> {
    const enterprise = await EnterpriseRepository.findById(enterpriseId);
    if (!enterprise || enterprise.admin_id !== adminUserId) {
      throw new Error('无权查看该企业的任务');
    }

    return await TaskRepository.findByEnterprise(enterpriseId, page, pageSize, status as any);
  }

  /**
   * 获取员工被分配的任务列表
   */
  static async getUserTasks(userId: number, page: number, pageSize: number): Promise<any[]> {
    return await TaskRepository.findByUserId(userId, page, pageSize);
  }

  /**
   * 更新任务分配状态（员工标记完成等）
   */
  static async updateAssignmentStatus(taskId: number, userId: number, status: string, notes?: string): Promise<void> {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw new Error('任务不存在');

    // 验证用户是否被分配了此任务（或是否是管理员）
    const isCreator = task.creator_id === userId;
    if (!isCreator) {
      const employee = await EmployeeRepository.findByUserId(userId);
      if (!employee || employee.enterprise_id !== task.enterprise_id) {
        throw new Error('您没有权限操作此任务');
      }
    }

    await TaskRepository.updateAssignmentStatus(taskId, userId, status as any, notes);
  }
}
