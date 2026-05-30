import { AuditRecord, AuditOverallStatus } from '../types/index.js';
export declare class AuditRecordRepository {
    static create(data: {
        user_id: number;
        enterprise_id?: number | null;
        task_id?: number | null;
        file_name: string;
        file_path: string;
        file_size: number;
        file_format: string;
        spec_requirements: Record<string, unknown>;
        rule_ids?: number[] | null;
        audit_result: Record<string, unknown>;
        overall_status: AuditOverallStatus;
        score?: number | null;
        points_cost: number;
        report_path?: string | null;
    }): Promise<number>;
    static findById(id: number): Promise<AuditRecord | null>;
    static findWithFilters(filters: {
        user_id?: number;
        enterprise_id?: number;
        status?: AuditOverallStatus;
        keyword?: string;
        start_date?: string;
        end_date?: string;
        page: number;
        pageSize: number;
    }): Promise<{
        list: AuditRecord[];
        total: number;
    }>;
    static countTodayByUser(userId: number): Promise<number>;
}
//# sourceMappingURL=AuditRecordRepository.d.ts.map