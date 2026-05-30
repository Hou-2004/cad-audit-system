import { Request, Response } from 'express';
export declare class SubscriptionController {
    /** 获取可购买套餐列表 */
    static getTiers(_req: Request, res: Response): Promise<void>;
    /** 获取当前企业套餐状态（管理员查看） */
    static getSubscriptionStatus(req: any, res: Response): Promise<void>;
    /** 获取企业订单列表 */
    static getOrders(req: any, res: Response): Promise<void>;
    /** 创建订单（购买/续费/升级） */
    static createOrder(req: any, res: Response): Promise<void>;
    /** 模拟支付（测试/开发用） */
    static mockPay(_req: Request, res: Response): Promise<void>;
    /** 获取订单详情 */
    static getOrderDetail(_req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=SubscriptionController.d.ts.map