import { SubscriptionTier, SubscriptionOrder, PaginatedResult } from '../types';
export declare class SubscriptionRepository {
    /** 获取所有上架套餐 */
    static getActiveTiers(): Promise<SubscriptionTier[]>;
    /** 按 ID 查找套餐 */
    static getTierById(id: number): Promise<SubscriptionTier | null>;
    /** 按代码查找套餐 */
    static getTierByCode(code: string): Promise<SubscriptionTier | null>;
    /** 创建订单 */
    static createOrder(order: Omit<SubscriptionOrder, 'id' | 'created_at' | 'updated_at'>): Promise<number>;
    /** 按订单号查找 */
    static getOrderByNo(orderNo: string): Promise<SubscriptionOrder | null>;
    /** 按 ID 查找订单（含套餐信息） */
    static getOrderById(id: number): Promise<SubscriptionOrder | null>;
    /** 更新订单状态 */
    static updateOrderStatus(id: number, status: string, extra?: Record<string, unknown>): Promise<void>;
    /** 查询企业订单列表（分页） */
    static getOrdersByEnterprise(enterpriseId: number, page?: number, pageSize?: number): Promise<PaginatedResult<any>>;
    /** 查询用户订单列表（分页） */
    static getOrdersByUser(userId: number, page?: number, pageSize?: number): Promise<PaginatedResult<any>>;
    /** 检查企业是否有进行中的待支付订单 */
    static getPendingOrderByEnterprise(enterpriseId: number): Promise<SubscriptionOrder | null>;
    /** 更新企业的套餐字段 */
    static updateEnterpriseSubscription(enterpriseId: number, fields: {
        tier_id?: number | null;
        subscription_started_at?: string | null;
        subscription_expires_at?: string | null;
        daily_task_limit?: number;
        tasks_issued_today?: number;
        task_limit_reset_date?: string;
        status?: string;
    }): Promise<void>;
    /** 重置每日任务下发计数（供定时任务调用） */
    static resetDailyTaskCounts(): Promise<number>;
    /** 获取即将到期的企业列表（N天内） */
    static getExpiringEnterprises(days?: number): Promise<any[]>;
    /** 冻结已过期但未冻结的企业 */
    static freezeExpiredEnterprises(): Promise<number>;
    /** 企业订单统计 */
    static getOrderStats(enterpriseId: number): Promise<{
        totalOrders: number;
        paidOrders: number;
        totalSpent: number;
    }>;
}
//# sourceMappingURL=SubscriptionRepository.d.ts.map