"use strict";
// ============================================================
// 充值记录 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RechargeRecordRepository = void 0;
const database_js_1 = require("../config/database.js");
class RechargeRecordRepository {
    static async create(data) {
        const [result] = await database_js_1.pool.execute(`INSERT INTO recharge_records (user_id, amount, points_granted, payment_method, trade_no)
       VALUES (?, ?, ?, ?, ?)`, [data.user_id, data.amount, data.points_granted, data.payment_method, data.trade_no || null]);
        return result.insertId;
    }
    static async updateStatus(id, status) {
        const sets = ['status = ?', 'updated_at = NOW()'];
        const params = [status];
        if (status === 'paid') {
            sets.push('paid_at = NOW()');
        }
        params.push(id);
        const [result] = await database_js_1.pool.execute(`UPDATE recharge_records SET ${sets.join(', ')} WHERE id = ?`, params);
        return result.affectedRows > 0;
    }
    static async findByUserId(userId, page, pageSize) {
        const [[{ total }]] = await database_js_1.pool.execute('SELECT COUNT(*) as total FROM recharge_records WHERE user_id = ?', [userId]);
        const [rows] = await database_js_1.pool.execute('SELECT * FROM recharge_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, pageSize, (page - 1) * pageSize]);
        return { list: rows, total };
    }
    static async findById(id) {
        const [rows] = await database_js_1.pool.execute('SELECT * FROM recharge_records WHERE id = ?', [id]);
        return rows[0] || null;
    }
}
exports.RechargeRecordRepository = RechargeRecordRepository;
