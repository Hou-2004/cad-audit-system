"use strict";
// ============================================================
// 任务 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const database_js_1 = require("../config/database.js");
class TaskRepository {
    // 根据ID查找（含分配信息）
    static async findById(id) {
        const [rows] = await database_js_1.pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!rows[0])
            return null;
        const task = rows[0];
        const [assignRows] = await database_js_1.pool.execute(`SELECT ta.*, u.username FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`, [id]);
        return { ...task, assignments: assignRows };
    }
    // 创建任务
    static async create(data) {
        const [result] = await database_js_1.pool.execute(`INSERT INTO tasks (enterprise_id, creator_id, title, description, spec_requirements,
       selected_rule_ids, target_user_ids, priority, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.enterprise_id, data.creator_id, data.title, data.description || null,
            JSON.stringify(data.spec_requirements), data.selected_rule_ids ? JSON.stringify(data.selected_rule_ids) : null,
            data.target_user_ids ? JSON.stringify(data.target_user_ids) : null,
            data.priority, data.deadline || null, data.status]);
        return result.insertId;
    }
    // 更新任务
    static async update(id, fields) {
        const sets = [];
        const values = [];
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                if (['spec_requirements', 'selected_rule_ids', 'target_user_ids'].includes(key)) {
                    sets.push(`${key} = ?`);
                    values.push(typeof value === 'object' ? JSON.stringify(value) : value);
                }
                else {
                    sets.push(`${key} = ?`);
                    values.push(value);
                }
            }
        }
        if (sets.length === 0)
            return false;
        values.push(id);
        const [result] = await database_js_1.pool.execute(`UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
        return result.affectedRows > 0;
    }
    // 删除任务
    static async delete(id) {
        const [result] = await database_js_1.pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    // 查询企业下的所有任务
    static async findByEnterprise(enterpriseId, page, pageSize, status) {
        let where = 'WHERE enterprise_id = ?';
        const params = [enterpriseId];
        if (status) {
            where += ' AND status = ?';
            params.push(status);
        }
        const [[{ total }]] = await database_js_1.pool.execute(`SELECT COUNT(*) as total FROM tasks ${where}`, params);
        params.push(pageSize, (page - 1) * pageSize);
        const [rows] = await database_js_1.pool.execute(`SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, params);
        return { list: rows, total };
    }
    // 查询员工被分配的任务
    static async findByUserId(userId, page, pageSize) {
        const offset = (page - 1) * pageSize;
        const [rows] = await database_js_1.pool.execute(`SELECT t.*, ta.status as assignment_status FROM tasks t
       JOIN task_assignments ta ON t.id = ta.task_id
       WHERE ta.user_id = ?
       ORDER BY t.created_at DESC LIMIT ? OFFSET ?`, [userId, pageSize, offset]);
        return rows;
    }
    // 分配任务给员工
    static async assign(taskId, userIds) {
        for (const uid of userIds) {
            await database_js_1.pool.execute('INSERT IGNORE INTO task_assignments (task_id, user_id) VALUES (?, ?)', [taskId, uid]);
        }
    }
    // 更新任务分配状态
    static async updateAssignmentStatus(taskId, userId, status, notes) {
        const sets = ['status = ?', 'updated_at = NOW()'];
        const values = [status];
        if (status === 'completed') {
            sets.push('completed_at = NOW()');
        }
        if (notes) {
            sets.push('notes = ?');
            values.push(notes);
        }
        values.push(taskId, userId);
        const [result] = await database_js_1.pool.execute(`UPDATE task_assignments SET ${sets.join(', ')} WHERE task_id = ? AND user_id = ?`, values);
        return result.affectedRows > 0;
    }
}
exports.TaskRepository = TaskRepository;
