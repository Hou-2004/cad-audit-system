"use strict";
// ============================================================
// 员工关系 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeRepository = void 0;
const database_js_1 = require("../config/database.js");
class EmployeeRepository {
    // 根据企业ID查找所有员工（含用户信息）
    static async findByEnterpriseId(enterpriseId) {
        const [rows] = await database_js_1.pool.execute(`SELECT e.*, u.username, u.email, u.phone, u.avatar, u.role, u.status as user_status,
              u.created_at as user_created_at
       FROM employees e JOIN users u ON e.user_id = u.id
       WHERE e.enterprise_id = ?
       ORDER BY e.joined_at DESC`, [enterpriseId]);
        return rows.map(this.formatRow);
    }
    // 根据用户ID查找员工关系
    static async findByUserId(userId) {
        const [rows] = await database_js_1.pool.execute(`SELECT e.*, ent.name as enterprise_name, ent.status as enterprise_status
       FROM employees e JOIN enterprises ent ON e.enterprise_id = ent.id
       WHERE e.user_id = ?`, [userId]);
        return rows[0] ? this.formatRow(rows[0]) : null;
    }
    // 检查用户是否是某企业员工
    static async isEmployeeOf(enterpriseId, userId) {
        const [rows] = await database_js_1.pool.execute('SELECT 1 FROM employees WHERE enterprise_id = ? AND user_id = ?', [enterpriseId, userId]);
        return rows.length > 0;
    }
    // 添加员工绑定
    static async create(data) {
        const [result] = await database_js_1.pool.execute('INSERT INTO employees (enterprise_id, user_id, is_admin, registration_method) VALUES (?, ?, ?, ?)', [data.enterprise_id, data.user_id, data.is_admin || false, data.registration_method || 'bound']);
        return result.insertId;
    }
    // 移除员工（踢出）
    static async remove(enterpriseId, userId) {
        const [result] = await database_js_1.pool.execute('DELETE FROM employees WHERE enterprise_id = ? AND user_id = ?', [enterpriseId, userId]);
        return result.affectedRows > 0;
    }
    // 更新员工权限（提升为管理员）
    static async setAdmin(enterpriseId, userId, isAdmin) {
        const [result] = await database_js_1.pool.execute('UPDATE employees SET is_admin = ?, updated_at = NOW() WHERE enterprise_id = ? AND user_id = ?', [+isAdmin, enterpriseId, userId]);
        return result.affectedRows > 0;
    }
    // 获取企业员工数量
    static async countByEnterprise(enterpriseId) {
        const [rows] = await database_js_1.pool.execute('SELECT COUNT(*) as count FROM employees WHERE enterprise_id = ?', [enterpriseId]);
        return rows[0].count;
    }
    // 格式化行数据
    static formatRow(row) {
        const r = row;
        return {
            id: r.id,
            enterprise_id: r.enterprise_id,
            user_id: r.user_id,
            is_admin: !!r.is_admin,
            registration_method: (r.registration_method || 'bound'),
            joined_at: r.joined_at?.toString() || '',
            created_at: r.created_at?.toString() || '',
            updated_at: r.updated_at?.toString() || '',
        };
    }
}
exports.EmployeeRepository = EmployeeRepository;
