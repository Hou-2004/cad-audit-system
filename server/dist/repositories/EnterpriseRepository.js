"use strict";
// ============================================================
// 企业 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseRepository = void 0;
const database_js_1 = require("../config/database.js");
class EnterpriseRepository {
    // 根据ID查找
    static async findById(id) {
        const [rows] = await database_js_1.pool.execute('SELECT * FROM enterprises WHERE id = ?', [id]);
        return rows[0] || null;
    }
    // 根据管理员ID查找
    static async findByAdminId(adminId) {
        const [rows] = await database_js_1.pool.execute('SELECT * FROM enterprises WHERE admin_id = ?', [adminId]);
        return rows[0] || null;
    }
    // 创建企业
    static async create(data) {
        const [result] = await database_js_1.pool.execute('INSERT INTO enterprises (name, description, admin_id) VALUES (?, ?, ?)', [data.name, data.description || null, data.admin_id]);
        return result.insertId;
    }
    // 更新企业信息
    static async update(id, fields) {
        const sets = [];
        const values = [];
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                sets.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (sets.length === 0)
            return false;
        values.push(id);
        const [result] = await database_js_1.pool.execute(`UPDATE enterprises SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
        return result.affectedRows > 0;
    }
    // 增加员工名额（同时增加总名额和免费名额）
    static async addEmployeeSlots(id, count) {
        await database_js_1.pool.execute('UPDATE enterprises SET free_employee_slots = free_employee_slots + ?, total_employee_slots = total_employee_slots + ? WHERE id = ?', [count, count, id]);
    }
    // 消耗一个免费员工名额
    static async consumeFreeSlot(id) {
        const enterprise = await this.findById(id);
        if (!enterprise || enterprise.free_employee_slots <= 0)
            return false;
        const [result] = await database_js_1.pool.execute('UPDATE enterprises SET free_employee_slots = free_employee_slots - 1 WHERE id = ? AND free_employee_slots > 0', [id]);
        return result.affectedRows > 0;
    }
    // 分页查询企业列表
    static async findAll(page, pageSize) {
        const [[{ total }]] = await database_js_1.pool.execute('SELECT COUNT(*) as total FROM enterprises');
        const offset = (page - 1) * pageSize;
        const [rows] = await database_js_1.pool.execute(`SELECT e.*, u.username as admin_username
       FROM enterprises e LEFT JOIN users u ON e.admin_id = u.id
       ORDER BY e.created_at DESC LIMIT ? OFFSET ?`, [pageSize, offset]);
        return { list: rows, total };
    }
}
exports.EnterpriseRepository = EnterpriseRepository;
