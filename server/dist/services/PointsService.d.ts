export declare class PointsService {
    /**
     * 充值（模拟支付）
     */
    static recharge(userId: number, amount: number, paymentMethod: string): Promise<any>;
    /**
     * 获取用户积分余额和审核次数信息
     */
    static getPointsInfo(userId: number): Promise<{
        balance: number;
        freeAuditDaily: number;
        freeAuditUsed: number;
        freeAuditRemaining: number;
    }>;
    /**
     * 获取积分流水记录
     */
    static getPointRecords(userId: number, page: number, pageSize: number): Promise<any>;
    /**
     * 获取充值记录
     */
    static getRechargeRecords(userId: number, page: number, pageSize: number): Promise<any>;
}
//# sourceMappingURL=PointsService.d.ts.map