"use strict";
// ============================================================
// 积分与充值控制器
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointsController = void 0;
const PointsService_js_1 = require("../services/PointsService.js");
const response_js_1 = require("../utils/response.js");
class PointsController {
    // 充值
    static async recharge(req, res) {
        const userId = req.user?.userId;
        const { amount, payment_method } = req.body;
        if (!amount || amount < 1) {
            res.status(400).json({ code: 400, message: '充值金额需大于0', data: null });
            return;
        }
        try {
            const record = await PointsService_js_1.PointsService.recharge(userId, amount, payment_method || 'mock');
            (0, response_js_1.success)(res, record, '充值成功');
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 获取积分信息（余额、免费次数）
    static async getInfo(req, res) {
        const userId = req.user?.userId;
        try {
            const info = await PointsService_js_1.PointsService.getPointsInfo(userId);
            (0, response_js_1.success)(res, info);
        }
        catch (err) {
            res.status(500).json({ code: 500, message: err.message, data: null });
        }
    }
    // 积分流水
    static async getRecords(req, res) {
        const userId = req.user?.userId;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 20, 1), 50);
        const result = await PointsService_js_1.PointsService.getPointRecords(userId, page, pageSize);
        (0, response_js_1.paginated)(res, result.list, result.total, page, pageSize);
    }
    // 充值记录
    static async getRechargeHistory(req, res) {
        const userId = req.user?.userId;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 20, 1), 50);
        const result = await PointsService_js_1.PointsService.getRechargeRecords(userId, page, pageSize);
        (0, response_js_1.paginated)(res, result.list, result.total, page, pageSize);
    }
}
exports.PointsController = PointsController;
