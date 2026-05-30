import { User, UserRole } from '../types/index.js';
export declare class UserRepository {
    static findById(id: number): Promise<User | null>;
    static findByEmail(email: string): Promise<User | null>;
    static findByPhone(phone: string): Promise<User | null>;
    static create(data: {
        email: string;
        phone?: string;
        password: string;
        username: string;
        role?: UserRole;
    }): Promise<number>;
    static update(id: number, fields: Partial<Omit<User, 'id' | 'created_at'>>): Promise<boolean>;
    static addPoints(id: number, amount: number): Promise<number>;
    static deductPoints(id: number, amount: number): Promise<number>;
    static resetDailyFreeCounts(): Promise<void>;
    static useFreeAuditCount(id: number): Promise<{
        used: number;
        daily: number;
    }>;
    static findAll(page: number, pageSize: number, filters?: {
        role?: string;
        keyword?: string;
        status?: string;
    }): Promise<{
        list: User[];
        total: number;
    }>;
    static findEmployeeRelation(userId: number): Promise<{
        enterprise_id: number;
        is_admin: boolean;
    } | null>;
}
//# sourceMappingURL=UserRepository.d.ts.map