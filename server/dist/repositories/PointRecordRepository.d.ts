import { PointType } from '../types/index.js';
export declare class PointRecordRepository {
    static create(data: {
        user_id: number;
        amount: number;
        type: PointType;
        description?: string;
        related_id?: number | null;
        balance_after: number;
    }): Promise<number>;
    static findByUserId(userId: number, page: number, pageSize: number): Promise<{
        list: any[];
        total: number;
    }>;
}
//# sourceMappingURL=PointRecordRepository.d.ts.map