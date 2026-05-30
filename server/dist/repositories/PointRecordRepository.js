"use strict";
// ============================================================
// 积分记录 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointRecordRepository = void 0;
const database_js_1 = require("../config/database.js");
class PointRecordRepository {
    // 创建积分变动记录
    static async create(data) {
        const [result] = await database_js_1.pool.execute(`INSERT INTO point_records (user_id, amount, type, description, related_id, balance_after)
       VALUES (?, ?, ?, ?, ?, ?)`, [data.user_id, data.amount, data.type, data.description || null, data.related_id || null, data.balance_after]);
        return result.insertId;
    }
    // 查询用户积分流水
    static async findByUserId(userId, page, pageSize) {
        const [[{ total }]] = await database_js_1.pool.execute('SELECT COUNT(*) as total FROM point_records WHERE user_id = ?', [userId]);
        const [rows] = await database_js_1.pool.execute('SELECT * FROM point_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, pageSize, (page - 1) * pageSize]);
        return { list: rows, total };
    }
}
exports.PointRecordRepository = PointRecordRepository;
