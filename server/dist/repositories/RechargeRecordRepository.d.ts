import { RechargeStatus } from '../types/index.js';
export declare class RechargeRecordRepository {
    static create(data: {
        user_id: number;
        amount: number;
        points_granted: number;
        payment_method: string;
        trade_no?: string | null;
    }): Promise<number>;
    static updateStatus(id: number, status: RechargeStatus): Promise<boolean>;
    static findByUserId(userId: number, page: number, pageSize: number): Promise<{
        list: any[];
        total: number;
    }>;
    static findById(id: number): Promise<any>;
}
//# sourceMappingURL=RechargeRecordRepository.d.ts.map