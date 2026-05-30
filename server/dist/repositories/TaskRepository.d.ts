import { Task, TaskStatus, AssignmentStatus } from '../types/index.js';
export declare class TaskRepository {
    static findById(id: number): Promise<Task & {
        assignments?: any[];
    } | null>;
    static create(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<number>;
    static update(id: number, fields: Partial<Omit<Task, 'id' | 'created_at' | 'enterprise_id'>>): Promise<boolean>;
    static delete(id: number): Promise<boolean>;
    static findByEnterprise(enterpriseId: number, page: number, pageSize: number, status?: TaskStatus): Promise<{
        list: Task[];
        total: number;
    }>;
    static findByUserId(userId: number, page: number, pageSize: number): Promise<(Task & {
        assignment_status: AssignmentStatus;
    })[]>;
    static assign(taskId: number, userIds: number[]): Promise<void>;
    static updateAssignmentStatus(taskId: number, userId: number, status: AssignmentStatus, notes?: string): Promise<boolean>;
}
//# sourceMappingURL=TaskRepository.d.ts.map