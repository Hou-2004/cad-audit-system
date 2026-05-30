import { AuditRule, RuleCategory } from '../types/index.js';
export declare class AuditRuleRepository {
    static findByIds(ids: number[]): Promise<AuditRule[]>;
    static findPreset(): Promise<AuditRule[]>;
    static findWithFilters(filters: {
        category?: RuleCategory | null;
        isPreset?: boolean | null;
        status?: string | null;
        page?: number;
        pageSize?: number;
    }): Promise<{
        list: AuditRule[];
        total: number;
    }>;
    static create(data: {
        name: string;
        category: RuleCategory;
        description?: string | null;
        rule_config: Record<string, unknown>;
        creator_id: number;
        is_preset?: boolean;
    }): Promise<number>;
    static update(id: number, data: {
        name?: string;
        category?: RuleCategory;
        description?: string | null;
        rule_config?: Record<string, unknown>;
        status?: string;
    }): Promise<boolean>;
    static findById(id: number): Promise<AuditRule | null>;
}
//# sourceMappingURL=AuditRuleRepository.d.ts.map