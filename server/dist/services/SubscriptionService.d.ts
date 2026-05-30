import { Enterprise, SubscriptionTier, SubscriptionOrder, SubPaymentMethod } from '../types/index.js';
export declare class SubscriptionService {
    /** 获取所有可购买的套餐列表 */
    static getAvailableTiers(): Promise<SubscriptionTier[]>;
    /** 获取企业当前套餐状态 */
    static getEnterpriseSubscriptionStatus(enterpriseId: number): Promise<{
        enterprise: Enterprise;
        tier: SubscriptionTier | null;
        isActive: boolean;
        isExpiring: boolean;
        daysRemaining: number;
        canIssueTasks: boolean;
        tasksRemainingToday: number;
        orderStats: {
            totalOrders: number;
            paidOrders: number;
            totalSpent: number;
        };
    }>;
    /** 获取企业订单列表 */
    static getEnterpriseOrders(enterpriseId: number, page?: number, pageSize?: number): Promise<import("../types/index.js").PaginatedResult<any>>;
    /** 获取用户订单列表 */
    static getUserOrders(userId: number, page?: number, pageSize?: number): Promise<import("../types/index.js").PaginatedResult<any>>;
    /**
     * 创建订单 — 支持首次购买 / 续费 / 升级
     * @param userId 下单的管理员用户ID
     * @param enterpriseId 目标企业ID
     * @param tierId 目标套餐ID
     * @param paymentMethod 支付方式: points_only | cash_only | points_cash | mock
     * @param pointsToUse 使用积分抵扣数量（可选）
     */
    static createOrder(userId: number, enterpriseId: number, tierId: number, paymentMethod: SubPaymentMethod, pointsToUse?: number): Promise<SubscriptionOrder>;
    /**
     * 支付成功回调 — 处理订单支付完成后的业务逻辑
     * 包括: 扣减积分、更新订单状态、更新企业套餐信息、解冻企业
     */
    static handlePaymentSuccess(orderNo: string): Promise<SubscriptionOrder>;
    /**
     * 模拟支付（开发/测试用）— 直接标记订单为已支付
     */
    static mockPay(orderNo: string): Promise<SubscriptionOrder>;
    /**
     * 校验管理员今日是否还能下发任务
     * 在 TaskService.createTask 中调用
     * @returns { canIssue, remaining, limit }
     */
    static checkTaskQuota(enterpriseId: number): Promise<{
        canIssue: boolean;
        remaining: number;
        limit: number;
        reason?: string;
    }>;
    /** 递增今日已下发任务数（在任务创建成功后调用） */
    static incrementTaskCount(enterpriseId: number): Promise<void>;
    /**
     * 重置每日任务下发计数（应在每天 00:00 执行）
     */
    static dailyReset(): Promise<{
        enterprisesReset: number;
        frozenCount: number;
    }>;
    /**
     * 获取即将到期的企业（用于续费提醒通知）
     */
    static getExpiringEnterprises(days?: number): Promise<any[]>;
}
//# sourceMappingURL=SubscriptionService.d.ts.map