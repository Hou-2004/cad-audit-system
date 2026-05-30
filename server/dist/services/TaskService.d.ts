export declare class TaskService {
    /**
     * 创建任务 — 增加套餐任务限额校验
     */
    static createTask(adminUserId: number, enterpriseId: number, data: {
        title: string;
        description?: string;
        spec_requirements: Record<string, unknown>;
        selected_rule_ids?: number[];
        target_user_ids?: number[];
        priority: 'low' | 'medium' | 'high' | 'urgent';
        deadline?: string;
    }): Promise<number>;
    /**
     * 更新任务
     */
    static updateTask(taskId: number, adminUserId: number, data: Partial<{
        title: string;
        description: string;
        spec_requirements: Record<string, unknown>;
        selected_rule_ids: number[];
        target_user_ids: number[];
        priority: string;
        deadline: string;
        status: string;
    }>): Promise<void>;
    /**
     * 删除任务
     */
    static deleteTask(taskId: number, adminUserId: number): Promise<void>;
    /**
     * 获取企业下的所有任务
     */
    static getEnterpriseTasks(enterpriseId: number, adminUserId: number, page: number, pageSize: number, status?: string): Promise<any>;
    /**
     * 获取员工被分配的任务列表
     */
    static getUserTasks(userId: number, page: number, pageSize: number): Promise<any[]>;
    /**
     * 更新任务分配状态（员工标记完成等）
     */
    static updateAssignmentStatus(taskId: number, userId: number, status: string, notes?: string): Promise<void>;
}
//# sourceMappingURL=TaskService.d.ts.map