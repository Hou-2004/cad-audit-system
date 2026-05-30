"use strict";
// ============================================================
// 企业套餐订阅服务 — 核心业务逻辑
// ============================================================
// 覆盖: 套餐查询 / 首次购买 / 续费 / 升级(补差价) /
//       积分抵扣+现金混合支付 / 到期冻结 / 任务限额校验 /
//       续费提醒定时任务
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const database_js_1 = require("../config/database.js");
const SubscriptionRepository_js_1 = require("../repositories/SubscriptionRepository.js");
const UserRepository_js_1 = require("../repositories/UserRepository.js");
const PointRecordRepository_js_1 = require("../repositories/PointRecordRepository.js");
const errors_1 = require("../utils/errors");
class SubscriptionService {
    // ==================== 查询类 API ====================
    /** 获取所有可购买的套餐列表 */
    static async getAvailableTiers() {
        return await SubscriptionRepository_js_1.SubscriptionRepository.getActiveTiers();
    }
    /** 获取企业当前套餐状态 */
    static async getEnterpriseSubscriptionStatus(enterpriseId) {
        const rows = await database_js_1.db.query(`SELECT e.*, t.name as tier_name, t.code as tier_code, t.price_yearly,
              t.daily_task_limit, t.description
       FROM enterprises e
       LEFT JOIN subscription_tiers t ON e.tier_id = t.id
       WHERE e.id = ?`, [enterpriseId]);
        if (!rows.length)
            throw new errors_1.AppError('企业不存在', 404);
        const ent = rows[0];
        const tier = ent.tier_id ? {
            id: ent.tier_id, name: ent.tier_name, code: ent.tier_code,
            price_yearly: ent.price_yearly, daily_task_limit: ent.daily_task_limit,
            description: ent.description,
        } : null;
        const now = new Date();
        const expiresAt = ent.subscription_expires_at ? new Date(ent.subscription_expires_at) : null;
        const isActive = !!(ent.tier_id && expiresAt && expiresAt > now && ent.status !== 'frozen');
        const daysRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000)) : 0;
        const isExpiring = isActive && daysRemaining <= 7;
        // 计算今日任务限额
        let canIssueTasks = true;
        let tasksRemainingToday = Infinity;
        if (isActive && ent.daily_task_limit > 0) {
            const today = now.toISOString().slice(0, 10);
            if (ent.task_limit_reset_date === today) {
                tasksRemainingToday = Math.max(0, ent.daily_task_limit - (ent.tasks_issued_today || 0));
                canIssueTasks = tasksRemainingToday > 0;
            }
            else {
                tasksRemainingToday = ent.daily_task_limit;
                canIssueTasks = true;
            }
        }
        const orderStats = await SubscriptionRepository_js_1.SubscriptionRepository.getOrderStats(enterpriseId);
        return {
            enterprise: { ...ent },
            tier,
            isActive,
            isExpiring,
            daysRemaining,
            canIssueTasks,
            tasksRemainingToday: tasksRemainingToday === Infinity ? -1 : tasksRemainingToday,
            orderStats,
        };
    }
    /** 获取企业订单列表 */
    static async getEnterpriseOrders(enterpriseId, page = 1, pageSize = 10) {
        return await SubscriptionRepository_js_1.SubscriptionRepository.getOrdersByEnterprise(enterpriseId, page, pageSize);
    }
    /** 获取用户订单列表 */
    static async getUserOrders(userId, page = 1, pageSize = 10) {
        return await SubscriptionRepository_js_1.SubscriptionRepository.getOrdersByUser(userId, page, pageSize);
    }
    // ==================== 核心下单逻辑 ====================
    /**
     * 创建订单 — 支持首次购买 / 续费 / 升级
     * @param userId 下单的管理员用户ID
     * @param enterpriseId 目标企业ID
     * @param tierId 目标套餐ID
     * @param paymentMethod 支付方式: points_only | cash_only | points_cash | mock
     * @param pointsToUse 使用积分抵扣数量（可选）
     */
    static async createOrder(userId, enterpriseId, tierId, paymentMethod, pointsToUse = 0) {
        // 1. 校验目标套餐是否存在且上架
        const targetTier = await SubscriptionRepository_js_1.SubscriptionRepository.getTierById(tierId);
        if (!targetTier || !targetTier.is_active) {
            throw new errors_1.AppError('目标套餐不存在或已下架', 400);
        }
        // 2. 查询当前企业状态
        const [ents] = await database_js_1.db.query('SELECT * FROM enterprises WHERE id = ?', [enterpriseId]);
        if (!ents)
            throw new errors_1.AppError('企业不存在', 404);
        // 3. 判断订单类型 & 计算
        const currentTierId = ents.tier_id;
        const currentExpiresAt = ents.subscription_expires_at ? new Date(ents.subscription_expires_at) : null;
        const now = new Date();
        let orderType = 'new';
        let originalPrice = targetTier.price_yearly;
        let discountAmount = 0;
        let finalPrice = targetTier.price_yearly;
        let periodStart;
        let periodEnd;
        let prevTierId = null;
        if (!currentTierId || !currentExpiresAt || currentExpiresAt < now) {
            // --- 首次购买 或 已过期重新购买 ---
            orderType = 'new';
            periodStart = now.toISOString().slice(0, 19).replace('T', ' ');
            const exp = new Date(now);
            exp.setFullYear(exp.getFullYear() + 1);
            periodEnd = exp.toISOString().slice(0, 19).replace('T', ' ');
        }
        else if (currentTierId === tierId) {
            // --- 续费：在原到期时间基础上延长1年 ---
            orderType = 'renew';
            periodStart = currentExpiresAt.toISOString().slice(0, 19).replace('T', ' ');
            const newExp = new Date(currentExpiresAt);
            newExp.setFullYear(newExp.getFullYear() + 1);
            periodEnd = newExp.toISOString().slice(0, 19).replace('T', ' ');
        }
        else {
            // --- 升级：计算差价，重置计费周期 ---
            orderType = 'upgrade';
            // 查询当前套餐价格
            const currentTier = await SubscriptionRepository_js_1.SubscriptionRepository.getTierById(currentTierId);
            const currentPrice = currentTier?.price_yearly || 0;
            // 计算已使用天数占一年的比例
            const startedAt = ents.subscription_started_at ? new Date(ents.subscription_started_at) : now;
            const totalMs = currentExpiresAt.getTime() - startedAt.getTime();
            const usedMs = now.getTime() - startedAt.getTime();
            const usageRatio = totalMs > 0 ? usedMs / totalMs : 0; // 0~1+
            // 差价 = 新套餐全价 - 当前套餐未消费部分
            const remainingValue = currentPrice * (1 - usageRatio);
            discountAmount = parseFloat((remainingValue - originalPrice).toFixed(2));
            // 如果 discountAmount < 0 说明升级要补差价；> 0 说明降级退差价（降级暂不允许）
            if (discountAmount > 0) {
                throw new errors_1.AppError('暂不支持降级操作，如需更换请先到期后重新购买', 400);
            }
            finalPrice = parseFloat((originalPrice + Math.abs(discountAmount)).toFixed(2));
            discountAmount = Math.abs(discountAmount); // 存为正值表示"优惠/抵扣"
            prevTierId = currentTierId;
            // 重置周期
            periodStart = now.toISOString().slice(0, 19).replace('T', ' ');
            const newExp = new Date(now);
            newExp.setFullYear(newExp.getFullYear() + 1);
            periodEnd = newExp.toISOString().slice(0, 19).replace('T', ' ');
        }
        // 4. 积分抵扣校验
        let pointsUsed = 0;
        let cashAmount = finalPrice;
        if (paymentMethod === 'points_only') {
            // 纯积分支付
            pointsUsed = Math.ceil(finalPrice); // 1积分=1元，向上取整
            cashAmount = 0;
        }
        else if (paymentMethod === 'points_cash' && pointsToUse > 0) {
            // 混合支付
            pointsUsed = Math.min(pointsToUse, Math.floor(finalPrice));
            cashAmount = parseFloat((finalPrice - pointsUsed).toFixed(2));
            if (cashAmount < 0)
                cashAmount = 0;
        }
        else if (paymentMethod === 'mock') {
            // 模拟支付：不实际扣积分
            pointsUsed = 0;
            cashAmount = finalPrice;
        }
        // 如果使用了积分，预检查余额
        if (pointsUsed > 0) {
            const [users] = await database_js_1.db.query('SELECT points FROM users WHERE id = ?', [userId]);
            if (!users || users.points < pointsUsed) {
                throw new errors_1.AppError(`积分不足，需要 ${pointsUsed} 积分，当前余额 ${users?.points || 0}`, 400);
            }
        }
        // 5. 生成订单号并创建
        const orderNo = `SUB${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const orderId = await SubscriptionRepository_js_1.SubscriptionRepository.createOrder({
            order_no: orderNo,
            enterprise_id: enterpriseId,
            user_id: userId,
            tier_id: tierId,
            order_type: orderType,
            original_price: originalPrice,
            discount_amount: discountAmount,
            final_price: finalPrice,
            points_used: pointsUsed,
            cash_amount: cashAmount,
            payment_method,
            trade_no: null,
            status: 'pending',
            paid_at: null,
            period_start: periodStart,
            period_end: periodEnd,
            prev_tier_id: prevTierId,
            remark: null,
        });
        return await SubscriptionRepository_js_1.SubscriptionRepository.getOrderById(orderId);
    }
    // ==================== 支付完成处理 ====================
    /**
     * 支付成功回调 — 处理订单支付完成后的业务逻辑
     * 包括: 扣减积分、更新订单状态、更新企业套餐信息、解冻企业
     */
    static async handlePaymentSuccess(orderNo) {
        const order = await SubscriptionRepository_js_1.SubscriptionRepository.getOrderByNo(orderNo);
        if (!order)
            throw new errors_1.AppError('订单不存在', 404);
        if (order.status === 'paid')
            throw new errors_1.AppError('订单已支付', 400);
        // 扣减积分（如果使用了积分）
        if (order.points_used > 0) {
            await UserRepository_js_1.UserRepository.addPoints(order.user_id, -order.points_used);
            // 记录积分变动
            await PointRecordRepository_js_1.PointRecordRepository.create({
                user_id: order.user_id,
                amount: -order.points_used,
                type: 'employee_slot_exchange',
                description: `套餐订购(${order.order_type})-${order.order_no}`,
                balance_after: 0,
            });
        }
        // 更新订单状态为已支付
        await SubscriptionRepository_js_1.SubscriptionRepository.updateOrderStatus(order.id, 'paid', {
            paid_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            ...(order.payment_method === 'mock' ? { trade_no: `MOCK_${Date.now()}` } : {}),
        });
        // 更新企业套餐状态
        await SubscriptionRepository_js_1.SubscriptionRepository.updateEnterpriseSubscription(order.enterprise_id, {
            tier_id: order.tier_id,
            subscription_started_at: order.period_start,
            subscription_expires_at: order.period_end,
            daily_task_limit: order.daily_task_limit, // 来自JOIN的tier字段
            status: 'active',
        });
        // 如果之前是 frozen 状态，自动激活
        return await SubscriptionRepository_js_1.SubscriptionRepository.getOrderById(order.id);
    }
    /**
     * 模拟支付（开发/测试用）— 直接标记订单为已支付
     */
    static async mockPay(orderNo) {
        return await this.handlePaymentSuccess(orderNo);
    }
    // ==================== 任务下发限额校验 ====================
    /**
     * 校验管理员今日是否还能下发任务
     * 在 TaskService.createTask 中调用
     * @returns { canIssue, remaining, limit }
     */
    static async checkTaskQuota(enterpriseId) {
        const [ents] = await database_js_1.db.query('SELECT tier_id, subscription_expires_at, daily_task_limit, tasks_issued_today, task_limit_reset_date, status FROM enterprises WHERE id = ?', [enterpriseId]);
        if (!ents)
            return { canIssue: false, remaining: 0, limit: 0, reason: '企业不存在' };
        // 冻结状态下不能下发
        if (ents.status === 'frozen') {
            return { canIssue: false, remaining: 0, limit: ents.daily_task_limit, reason: '企业套餐已冻结，请续费后再操作' };
        }
        // 无套餐（未付费）不能下发
        if (!ents.tier_id || !ents.subscription_expires_at) {
            return { canIssue: false, remaining: 0, limit: 0, reason: '企业尚未开通套餐，请先购买' };
        }
        // 套餐过期
        if (new Date(ents.subscription_expires_at) < new Date()) {
            return { canIssue: false, remaining: 0, limit: ents.daily_task_limit, reason: '企业套餐已到期，请续费' };
        }
        // 无限制套餐
        if (ents.daily_task_limit === 0) {
            return { canIssue: true, remaining: -1, limit: 0 };
        }
        // 有每日限额 — 先判断是否需要重置
        const today = new Date().toISOString().slice(0, 10);
        let issuedToday = ents.tasks_issued_today || 0;
        if (ents.task_limit_reset_date !== today) {
            issuedToday = 0;
            await SubscriptionRepository_js_1.SubscriptionRepository.updateEnterpriseSubscription(enterpriseId, {
                tasks_issued_today: 0,
                task_limit_reset_date: today,
            });
        }
        const remaining = ents.daily_task_limit - issuedToday;
        return {
            canIssue: remaining > 0,
            remaining: Math.max(0, remaining),
            limit: ents.daily_task_limit,
            reason: remaining <= 0 ? `今日任务下发已达上限 (${ents.daily_task_limit} 次)` : undefined,
        };
    }
    /** 递增今日已下发任务数（在任务创建成功后调用） */
    static async incrementTaskCount(enterpriseId) {
        const today = new Date().toISOString().slice(0, 10);
        await database_js_1.db.query(`UPDATE enterprises SET tasks_issued_today = tasks_issued_today + 1, task_limit_reset_date = ?
       WHERE id = ? AND task_limit_reset_date = ?`, [today, enterpriseId, today]);
    }
    // ==================== 定时任务 ====================
    /**
     * 重置每日任务下发计数（应在每天 00:00 执行）
     */
    static async dailyReset() {
        const resetCount = await SubscriptionRepository_js_1.SubscriptionRepository.resetDailyTaskCounts();
        const frozenCount = await SubscriptionRepository_js_1.SubscriptionRepository.freezeExpiredEnterprises();
        return { enterprisesReset: resetCount, frozenCount };
    }
    /**
     * 获取即将到期的企业（用于续费提醒通知）
     */
    static async getExpiringEnterprises(days = 7) {
        return await SubscriptionRepository_js_1.SubscriptionRepository.getExpiringEnterprises(days);
    }
}
exports.SubscriptionService = SubscriptionService;
