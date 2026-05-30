"use strict";
// ============================================================
// 积分与充值服务
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointsService = void 0;
const uuid_1 = require("uuid");
const index_js_1 = __importDefault(require("../config/index.js"));
const UserRepository_js_1 = require("../repositories/UserRepository.js");
const PointRecordRepository_js_1 = require("../repositories/PointRecordRepository.js");
const RechargeRecordRepository_js_1 = require("../repositories/RechargeRecordRepository.js");
class PointsService {
    /**
     * 充值（模拟支付）
     */
    static async recharge(userId, amount, paymentMethod) {
        const user = await UserRepository_js_1.UserRepository.findById(userId);
        if (!user)
            throw new Error('用户不存在');
        // 金额校验
        if (amount < 1 || amount > 10000) {
            throw new Error('充值金额需在 1-10000 元之间');
        }
        // 创建充值记录
        const pointsGranted = Math.floor(amount); // 1元 = 1积分
        const tradeNo = index_js_1.default.paymentMode === 'mock'
            ? `MOCK_${(0, uuid_1.v4)().replace(/-/g, '').toUpperCase().substring(0, 24)}`
            : null;
        const recordId = await RechargeRecordRepository_js_1.RechargeRecordRepository.create({
            user_id: userId,
            amount: Number(amount.toFixed(2)),
            points_granted: pointsGranted,
            payment_method: paymentMethod || 'mock',
            trade_no: tradeNo,
        });
        // 模拟支付成功
        if (index_js_1.default.paymentMode === 'mock') {
            // 模拟延迟
            await new Promise((resolve) => setTimeout(resolve, 500));
            // 更新充值状态为已支付
            await RechargeRecordRepository_js_1.RechargeRecordRepository.updateStatus(recordId, 'paid');
            // 增加用户积分
            const balanceAfter = await UserRepository_js_1.UserRepository.addPoints(userId, pointsGranted);
            // 记录积分变动
            await PointRecordRepository_js_1.PointRecordRepository.create({
                user_id: userId,
                amount: pointsGranted,
                type: 'recharge',
                description: `在线充值 ¥${amount}`,
                related_id: recordId,
                balance_after: balanceAfter,
            });
        }
        return await RechargeRecordRepository_js_1.RechargeRecordRepository.findById(recordId);
    }
    /**
     * 获取用户积分余额和审核次数信息
     */
    static async getPointsInfo(userId) {
        const user = await UserRepository_js_1.UserRepository.findById(userId);
        if (!user)
            throw new Error('用户不存在');
        // 如果跨天，重置免费次数
        if (user.free_audit_reset_date < new Date().toISOString().split('T')[0]) {
            await UserRepository_js_1.UserRepository.update(user.id, { free_audit_count_used: 0, free_audit_reset_date: new Date().toISOString().split('T')[0] });
            return {
                balance: user.points,
                freeAuditDaily: user.free_audit_count_daily,
                freeAuditUsed: 0,
                freeAuditRemaining: user.free_audit_count_daily,
            };
        }
        return {
            balance: user.points,
            freeAuditDaily: user.free_audit_count_daily,
            freeAuditUsed: user.free_audit_count_used,
            freeAuditRemaining: Math.max(0, user.free_audit_count_daily - user.free_audit_count_used),
        };
    }
    /**
     * 获取积分流水记录
     */
    static async getPointRecords(userId, page, pageSize) {
        return await PointRecordRepository_js_1.PointRecordRepository.findByUserId(userId, page, pageSize);
    }
    /**
     * 获取充值记录
     */
    static async getRechargeRecords(userId, page, pageSize) {
        return await RechargeRecordRepository_js_1.RechargeRecordRepository.findByUserId(userId, page, pageSize);
    }
}
exports.PointsService = PointsService;
