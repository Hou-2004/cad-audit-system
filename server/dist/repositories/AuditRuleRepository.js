"use strict";
// ============================================================
// 审核规则 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditRuleRepository = void 0;
const database_js_1 = require("../config/database.js");
class AuditRuleRepository {
    // 根据ID列表查找规则
    static async findByIds(ids) {
        if (ids.length === 0)
            return [];
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await database_js_1.pool.execute(`SELECT * FROM audit_rules WHERE id IN (${placeholders}) AND status = 'active' ORDER BY id`, ids);
        return rows;
    }
    // 查找所有预设规则
    static async findPreset() {
        const [rows] = await database_js_1.pool.execute(`SELECT * FROM audit_rules WHERE is_preset = 1 AND status = 'active' ORDER BY category, id`);
        return rows;
    }
    // 分页查询（管理员用）
    static async findWithFilters(filters) {
        const conditions = [];
        const values = [];
        if (filters.category) {
            conditions.push('category = ?');
            values.push(filters.category);
        }
        if (filters.isPreset !== undefined && filters.isPreset !== null) {
            conditions.push('is_preset = ?');
            values.push(filters.isPreset ? 1 : 0);
        }
        if (filters.status) {
            conditions.push('status = ?');
            values.push(filters.status);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const page = filters.page || 1;
        const pageSize = filters.pageSize || 20;
        const offset = (page - 1) * pageSize;
        const [countRows] = await database_js_1.pool.execute(`SELECT COUNT(*) AS total FROM audit_rules ${whereClause}`, values);
        const total = countRows[0].total || 0;
        const [rows] = await database_js_1.pool.execute(`SELECT * FROM audit_rules ${whereClause} ORDER BY id LIMIT ? OFFSET ?`, [...values, pageSize, offset]);
        return { list: rows, total };
    }
    // 创建自定义规则
    static async create(data) {
        const [result] = await database_js_1.pool.execute(`INSERT INTO audit_rules (name, category, description, rule_config, is_preset, creator_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`, [data.name, data.category, data.description || null,
            JSON.stringify(data.rule_config), data.is_preset ? 1 : 0, data.creator_id]);
        return result.insertId;
    }
    // 更新规则
    static async update(id, data) {
        const fields = [];
        const values = [];
        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.category !== undefined) {
            fields.push('category = ?');
            values.push(data.category);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.rule_config !== undefined) {
            fields.push('rule_config = ?');
            values.push(JSON.stringify(data.rule_config));
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (fields.length === 0)
            return false;
        fields.push('updated_at = NOW()');
        values.push(id);
        await database_js_1.pool.execute(`UPDATE audit_rules SET ${fields.join(', ')} WHERE id = ?`, values);
        return true;
    }
    // 根据ID查找单条
    static async findById(id) {
        const [rows] = await database_js_1.pool.execute('SELECT * FROM audit_rules WHERE id = ?', [id]);
        return rows[0] || null;
    }
}
exports.AuditRuleRepository = AuditRuleRepository;
