export declare class EnterpriseService {
    /**
     * 创建企业（工作者注册成为企业管理员）— 需同时选择套餐并支付
     * @param tierId 选定的套餐ID（支付成功后由 SubscriptionService 激活）
     */
    static createEnterprise(adminUserId: number, name: string, description?: string, tierId?: number): Promise<any>;
    /**
     * 校验企业是否可执行管理操作（非冻结、有有效套餐）
     */
    static validateEnterpriseCanOperate(enterpriseId: number, operation?: string): Promise<void>;
    /**
     * 获取企业详情（含员工数等信息）
     */
    static getEnterpriseDetail(enterpriseId: number, requesterRole?: string, requesterId?: number): Promise<any>;
    /**
     * 绑定/拉取系统内已有的工作者为员工
     */
    static bindEmployee(enterpriseId: number, adminUserId: number, targetUserEmailOrPhone: string): Promise<any>;
    /**
     * 踢出员工
     */
    static removeEmployee(enterpriseId: number, adminUserId: number, targetUserId: number): Promise<void>;
    /**
     * 提升员工为管理员
     */
    static promoteToAdmin(enterpriseId: number, adminUserId: number, targetUserId: number): Promise<void>;
    /**
     * 直接注册新员工账号
     */
    static directRegisterEmployee(enterpriseId: number, adminUserId: number, data: {
        email: string;
        username: string;
        password: string;
    }): Promise<any>;
    /**
     * 兑换员工注册名额
     */
    static exchangeEmployeeSlots(enterpriseId: number, adminUserId: number, count: number): Promise<void>;
    /**
     * 获取企业员工列表
     */
    static getEmployees(enterpriseId: number, adminUserId: number): Promise<any[]>;
}
//# sourceMappingURL=EnterpriseService.d.ts.map