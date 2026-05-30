import { Enterprise } from '../types/index.js';
export declare class EnterpriseRepository {
    static findById(id: number): Promise<Enterprise | null>;
    static findByAdminId(adminId: number): Promise<Enterprise | null>;
    static create(data: {
        name: string;
        description?: string;
        admin_id: number;
    }): Promise<number>;
    static update(id: number, fields: Partial<Omit<Enterprise, 'id' | 'created_at' | 'admin_id'>>): Promise<boolean>;
    static addEmployeeSlots(id: number, count: number): Promise<void>;
    static consumeFreeSlot(id: number): Promise<boolean>;
    static findAll(page: number, pageSize: number): Promise<{
        list: (Enterprise & {
            admin_username?: string;
        })[];
        total: number;
    }>;
}
//# sourceMappingURL=EnterpriseRepository.d.ts.map