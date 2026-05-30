"use strict";
// ============================================================
// 套餐订阅控制器
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const SubscriptionService_1 = require("../services/SubscriptionService");
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
class SubscriptionController {
    // ---- 公开/用户接口 ----
    /** 获取可购买套餐列表 */
    static async getTiers(_req, res) {
        const tiers = await SubscriptionService_1.SubscriptionService.getAvailableTiers();
        (0, response_1.success)(res, tiers);
    }
    /** 获取当前企业套餐状态（管理员查看） */
    static async getSubscriptionStatus(req, res) {
        const enterpriseId = req.user.enterpriseId;
        if (!enterpriseId)
            throw new errors_1.AppError('您尚未创建或加入企业', 404);
        const status = await SubscriptionService_1.SubscriptionService.getEnterpriseSubscriptionStatus(enterpriseId);
        (0, response_1.success)(res, status);
    }
    /** 获取企业订单列表 */
    static async getOrders(req, res) {
        const enterpriseId = req.user.enterpriseId;
        if (!enterpriseId)
            throw new errors_1.AppError('您尚未创建或加入企业', 404);
        const page = parseInt(req.query.page) || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 50);
        const result = await SubscriptionService_1.SubscriptionService.getEnterpriseOrders(enterpriseId, page, pageSize);
        (0, response_1.success)(res, result);
    }
    /** 创建订单（购买/续费/升级） */
    static async createOrder(req, res) {
        const { tierId, paymentMethod, pointsToUse } = req.body;
        if (!tierId)
            throw new errors_1.AppError('请选择套餐', 400);
        const enterpriseId = req.user.enterpriseId;
        if (!enterpriseId)
            throw new errors_1.AppError('请先创建企业', 400);
        // 校验支付方式
        const validMethods = ['points_only', 'cash_only', 'points_cash', 'mock'];
        if (!validMethods.includes(paymentMethod))
            throw new errors_1.AppError('无效的支付方式', 400);
        const order = await SubscriptionService_1.SubscriptionService.createOrder(req.user.userId, enterpriseId, parseInt(tierId), paymentMethod, parseInt(pointsToUse) || 0);
        (0, response_1.success)(res, order, '订单创建成功', 201);
    }
    /** 模拟支付（测试/开发用） */
    static async mockPay(_req, res) {
        const { orderNo } = _req.body;
        if (!orderNo)
            throw new errors_1.AppError('缺少订单号', 400);
        const order = await SubscriptionService_1.SubscriptionService.mockPay(orderNo);
        (0, response_1.success)(res, order, '支付成功');
    }
    /** 获取订单详情 */
    static async getOrderDetail(_req, res) {
        const orderId = parseInt(_req.params.id);
        const { SubscriptionRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/SubscriptionRepository.js')));
        const order = await SubscriptionRepository.getOrderById(orderId);
        if (!order)
            throw new errors_1.AppError('订单不存在', 404);
        (0, response_1.success)(res, order);
    }
}
exports.SubscriptionController = SubscriptionController;
