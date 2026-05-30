"use strict";
// ============================================================
// 套餐 & 订单 数据访问层
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRepository = void 0;
const database_1 = require("../config/database");
class SubscriptionRepository {
    // ---- 套餐定义 ----
    /** 获取所有上架套餐 */
    static async getActiveTiers() {
        const rows = await database_1.db.query('SELECT * FROM subscription_tiers WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC');
        return rows;
    }
    /** 按 ID 查找套餐 */
    static async getTierById(id) {
        const rows = await database_1.db.query('SELECT * FROM subscription_tiers WHERE id = ?', [id]);
        return rows[0] || null;
    }
    /** 按代码查找套餐 */
    static async getTierByCode(code) {
        const rows = await database_1.db.query('SELECT * FROM subscription_tiers WHERE code = ?', [code]);
        return rows[0] || null;
    }
    // ---- 套餐订单 ----
    /** 创建订单 */
    static async createOrder(order) {
        const result = await database_1.db.query(`INSERT INTO subscription_orders (
        order_no, enterprise_id, user_id, tier_id, order_type,
        original_price, discount_amount, final_price, points_used, cash_amount,
        payment_method, trade_no, status, paid_at, period_start, period_end,
        prev_tier_id, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            order.order_no, order.enterprise_id, order.user_id, order.tier_id, order.order_type,
            order.original_price, order.discount_amount, order.final_price, order.points_used, order.cash_amount,
            order.payment_method, order.trade_no, order.status, order.paid_at, order.period_start, order.period_end,
            order.prev_tier_id, order.remark,
        ]);
        return result.insertId;
    }
    /** 按订单号查找 */
    static async getOrderByNo(orderNo) {
        const rows = await database_1.db.query(`SELECT so.*, st.name as tier_name, st.code as tier_code, st.daily_task_limit
       FROM subscription_orders so
       LEFT JOIN subscription_tiers st ON so.tier_id = st.id
       WHERE so.order_no = ?`, [orderNo]);
        return rows[0] || null;
    }
    /** 按 ID 查找订单（含套餐信息） */
    static async getOrderById(id) {
        const rows = await database_1.db.query(`SELECT so.*, st.name as tier_name, st.code as tier_code, st.daily_task_limit
       FROM subscription_orders so
       LEFT JOIN subscription_tiers st ON so.tier_id = st.id
       WHERE so.id = ?`, [id]);
        return rows[0] || null;
    }
    /** 更新订单状态 */
    static async updateOrderStatus(id, status, extra) {
        const sets = ['status = ?'];
        const vals = [status];
        if (extra) {
            for (const [k, v] of Object.entries(extra)) {
                sets.push(`${k} = ?`);
                vals.push(v);
            }
        }
        vals.push(id);
        await database_1.db.query(`UPDATE subscription_orders SET ${sets.join(', ')} WHERE id = ?`, vals);
    }
    /** 查询企业订单列表（分页） */
    static async getOrdersByEnterprise(enterpriseId, page = 1, pageSize = 10) {
        const offset = (page - 1) * pageSize;
        const [countRows] = await database_1.db.query('SELECT COUNT(*) as total FROM subscription_orders WHERE enterprise_id = ?', [enterpriseId]);
        const total = parseInt(countRows.total);
        const rows = await database_1.db.query(`SELECT so.*, st.name as tier_name, st.code as tier_code
       FROM subscription_orders so
       LEFT JOIN subscription_tiers st ON so.tier_id = st.id
       WHERE so.enterprise_id = ?
       ORDER BY so.created_at DESC
       LIMIT ? OFFSET ?`, [enterpriseId, pageSize, offset]);
        return { list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    /** 查询用户订单列表（分页） */
    static async getOrdersByUser(userId, page = 1, pageSize = 10) {
        const offset = (page - 1) * pageSize;
        const [countRows] = await database_1.db.query('SELECT COUNT(*) as total FROM subscription_orders WHERE user_id = ?', [userId]);
        const total = parseInt(countRows.total);
        const rows = await database_1.db.query(`SELECT so.*, e.name as enterprise_name, st.name as tier_name, st.code as tier_code
       FROM subscription_orders so
       JOIN enterprises e ON so.enterprise_id = e.id
       LEFT JOIN subscription_tiers st ON so.tier_id = st.id
       WHERE so.user_id = ?
       ORDER BY so.created_at DESC
       LIMIT ? OFFSET ?`, [userId, pageSize, offset]);
        return { list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    /** 检查企业是否有进行中的待支付订单 */
    static async getPendingOrderByEnterprise(enterpriseId) {
        const rows = await database_1.db.query("SELECT * FROM subscription_orders WHERE enterprise_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", [enterpriseId]);
        return rows[0] || null;
    }
    // ---- 企业套餐状态查询（辅助方法）----
    /** 更新企业的套餐字段 */
    static async updateEnterpriseSubscription(enterpriseId, fields) {
        const sets = [];
        const vals = [];
        for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined) {
                sets.push(`${k} = ?`);
                vals.push(v);
            }
        }
        if (sets.length === 0)
            return;
        vals.push(enterpriseId);
        await database_1.db.query(`UPDATE enterprises SET ${sets.join(', ')} WHERE id = ?`, vals);
    }
    /** 重置每日任务下发计数（供定时任务调用） */
    static async resetDailyTaskCounts() {
        const today = new Date().toISOString().slice(0, 10);
        const result = await database_1.db.query("UPDATE enterprises SET tasks_issued_today = 0, task_limit_reset_date = ? WHERE task_limit_reset_date != ? AND status = 'active'", [today, today]);
        return result.affectedRows;
    }
    /** 获取即将到期的企业列表（N天内） */
    static async getExpiringEnterprises(days = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const futureStr = futureDate.toISOString().slice(0, 19).replace('T', ' ');
        const rows = await database_1.db.query(`SELECT e.id, e.name, e.admin_id, e.subscription_expires_at, st.name as tier_name, u.email, u.username
       FROM enterprises e
       JOIN users u ON e.admin_id = u.id
       LEFT JOIN subscription_tiers st ON e.tier_id = st.id
       WHERE e.subscription_expires_at IS NOT NULL
         AND e.subscription_expires_at <= ?
         AND e.subscription_expires_at > NOW()
         AND e.status = 'active'
       ORDER BY e.subscription_expires_at ASC`, [futureStr]);
        return rows;
    }
    /** 冻结已过期但未冻结的企业 */
    static async freezeExpiredEnterprises() {
        const result = await database_1.db.query(`UPDATE enterprises SET status = 'frozen'
       WHERE subscription_expires_at IS NOT NULL
         AND subscription_expires_at < NOW()
         AND status IN ('active', 'suspended')`);
        return result.affectedRows;
    }
    // ---- 统计 ----
    /** 企业订单统计 */
    static async getOrderStats(enterpriseId) {
        const rows = await database_1.db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status="paid" THEN 1 ELSE 0 END) as paid, COALESCE(SUM(CASE WHEN status="paid" THEN final_price ELSE 0 END), 0) as spent FROM subscription_orders WHERE enterprise_id = ?', [enterpriseId]);
        const r = rows[0];
        return { totalOrders: r.total, paidOrders: r.paid, totalSpent: parseFloat(r.spent) || 0 };
    }
}
exports.SubscriptionRepository = SubscriptionRepository;
