"use strict";
// ============================================================
// 审核记录 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditRecordRepository = void 0;
const database_js_1 = require("../config/database.js");
class AuditRecordRepository {
    // 创建审核记录
    static async create(data) {
        const [result] = await database_js_1.pool.execute(`INSERT INTO audit_records
       (user_id, enterprise_id, task_id, file_name, file_path, file_size, file_format,
        spec_requirements, rule_ids, audit_result, overall_status, score, points_cost, report_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.user_id, data.enterprise_id || null, data.task_id || null,
            data.file_name, data.file_path, data.file_size, data.file_format,
            JSON.stringify(data.spec_requirements), data.rule_ids ? JSON.stringify(data.rule_ids) : null,
            JSON.stringify(data.audit_result), data.overall_status, data.score ?? null,
            data.points_cost, data.report_path || null]);
        return result.insertId;
    }
    // 根据ID查找
    static async findById(id) {
        const [rows] = await database_js_1.pool.execute('SELECT * FROM audit_records WHERE id = ?', [id]);
        return rows[0] || null;
    }
    // 分页查询（支持筛选）
    static async findWithFilters(filters) {
        const conditions = [];
        const params = [];
        if (filters.user_id) {
            conditions.push('ar.user_id = ?');
            params.push(filters.user_id);
        }
        if (filters.enterprise_id) {
            conditions.push('ar.enterprise_id = ?');
            params.push(filters.enterprise_id);
        }
        if (filters.status) {
            conditions.push('ar.overall_status = ?');
            params.push(filters.status);
        }
        if (filters.keyword) {
            conditions.push('(ar.file_name LIKE ?)');
            params.push(`%${filters.keyword}%`);
        }
        if (filters.start_date) {
            conditions.push('ar.created_at >= ?');
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            conditions.push('ar.created_at <= ?');
            params.push(filters.end_date + ' 23:59:59');
        }
        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const [[{ total }]] = await database_js_1.pool.execute(`SELECT COUNT(*) as total FROM audit_records ar ${where}`, params);
        params.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
        const [rows] = await database_js_1.pool.execute(`SELECT ar.*, u.username as uploader_username
       FROM audit_records ar LEFT JOIN users u ON ar.user_id = u.id
       ${where} ORDER BY ar.created_at DESC LIMIT ? OFFSET ?`, params);
        return { list: rows, total };
    }
    // 获取用户今日审核数量（用于统计）
    static async countTodayByUser(userId) {
        const [rows] = await database_js_1.pool.execute("SELECT COUNT(*) as count FROM audit_records WHERE user_id = ? AND DATE(created_at) = CURDATE()", [userId]);
        return rows[0].count;
    }
}
exports.AuditRecordRepository = AuditRecordRepository;
