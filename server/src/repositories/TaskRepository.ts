// ============================================================
// 任务 Repository
// ============================================================

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { Task, TaskStatus, AssignmentStatus } from '../types/index.js';

export class TaskRepository {
  // 根据ID查找（含分配信息）
  static async findById(id: number): Promise<Task & { assignments?: any[] } | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM tasks WHERE id = ?', [id],
    );
    if (!rows[0]) return null;
    const task = rows[0] as Task;

    const [assignRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ta.*, u.username FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [id],
    );
    return { ...task, assignments: assignRows };
  }

  // 创建任务
  static async create(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO tasks (enterprise_id, creator_id, title, description, spec_requirements,
       selected_rule_ids, target_user_ids, priority, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.enterprise_id, data.creator_id, data.title, data.description || null,
        JSON.stringify(data.spec_requirements), data.selected_rule_ids ? JSON.stringify(data.selected_rule_ids) : null,
        data.target_user_ids ? JSON.stringify(data.target_user_ids) : null,
        data.priority, data.deadline || null, data.status],
    );
    return result.insertId;
  }

  // 更新任务
  static async update(id: number, fields: Partial<Omit<Task, 'id' | 'created_at' | 'enterprise_id'>>): Promise<boolean> {
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        if (['spec_requirements', 'selected_rule_ids', 'target_user_ids'].includes(key)) {
          sets.push(`${key} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        } else {
          sets.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    if (sets.length === 0) return false;
    values.push(id);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values,
    );
    return result.affectedRows > 0;
  }

  // 删除任务
  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM tasks WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // 查询企业下的所有任务
  static async findByEnterprise(enterpriseId: number, page: number, pageSize: number, status?: TaskStatus): Promise<{ list: Task[]; total: number }> {
    let where = 'WHERE enterprise_id = ?';
    const params: unknown[] = [enterpriseId];
    if (status) { where += ' AND status = ?'; params.push(status); }

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as total FROM tasks ${where}`, params);
    params.push(pageSize, (page - 1) * pageSize);
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, params);
    return { list: rows as Task[], total };
  }

  // 查询员工被分配的任务
  static async findByUserId(userId: number, page: number, pageSize: number): Promise<(Task & { assignment_status: AssignmentStatus })[]> {
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.*, ta.status as assignment_status FROM tasks t
       JOIN task_assignments ta ON t.id = ta.task_id
       WHERE ta.user_id = ?
       ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      [userId, pageSize, offset],
    );
    return rows as (Task & { assignment_status: AssignmentStatus })[];
  }

  // 分配任务给员工
  static async assign(taskId: number, userIds: number[]): Promise<void> {
    for (const uid of userIds) {
      await pool.execute<ResultSetHeader>(
        'INSERT IGNORE INTO task_assignments (task_id, user_id) VALUES (?, ?)',
        [taskId, uid],
      );
    }
  }

  // 更新任务分配状态
  static async updateAssignmentStatus(taskId: number, userId: number, status: AssignmentStatus, notes?: string): Promise<boolean> {
    const sets: string[] = ['status = ?', 'updated_at = NOW()'];
    const values: unknown[] = [status];
    if (status === 'completed') { sets.push('completed_at = NOW()'); }
    if (notes) { sets.push('notes = ?'); values.push(notes); }
    values.push(taskId, userId);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE task_assignments SET ${sets.join(', ')} WHERE task_id = ? AND user_id = ?`,
      values,
    );
    return result.affectedRows > 0;
  }
}
