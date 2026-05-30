// ============================================================
// 用户 Repository - 数据库操作
// ============================================================

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { User, UserRole } from '../types/index.js';

export class UserRepository {
  // 根据ID查找
  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ? AND status = "active"',
      [id],
    );
    return rows[0] as User || null;
  }

  // 根据邮箱查找
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()],
    );
    return rows[0] as User || null;
  }

  // 根据手机号查找
  static async findByPhone(phone: string): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE phone = ?',
      [phone],
    );
    return rows[0] as User || null;
  }

  // 创建用户
  static async create(data: {
    email: string;
    phone?: string;
    password: string;
    username: string;
    role?: UserRole;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (email, phone, password, username, role, free_audit_reset_date)
       VALUES (?, ?, ?, ?, ?, CURDATE())`,
      [data.email.toLowerCase(), data.phone || null, data.password, data.username, data.role || 'worker'],
    );
    return result.insertId;
  }

  // 更新用户信息
  static async update(id: number, fields: Partial<Omit<User, 'id' | 'created_at'>>): Promise<boolean> {
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (sets.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values,
    );
    return result.affectedRows > 0;
  }

  // 增加积分（返回新余额）
  static async addPoints(id: number, amount: number): Promise<number> {
    await pool.execute('UPDATE users SET points = points + ? WHERE id = ?', [amount, id]);
    const user = await this.findById(id);
    return user?.points ?? 0;
  }

  // 扣减积分（余额不足抛错）
  static async deductPoints(id: number, amount: number): Promise<number> {
    const user = await this.findById(id);
    if (!user) throw new Error('用户不存在');
    if (user.points < amount) throw new Error(`积分不足：需要 ${amount}，当前 ${user.points}`);

    await pool.execute(
      'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?',
      [amount, id, amount],
    );
    const updated = await this.findById(id);
    return updated?.points ?? 0;
  }

  // 重置每日免费审核次数（每天0点调用）
  static async resetDailyFreeCounts(): Promise<void> {
    await pool.execute(
      "UPDATE users SET free_audit_count_used = 0, free_audit_reset_date = CURDATE() WHERE free_audit_reset_date < CURDATE()"
    );
  }

  // 使用一次免费审核次数
  static async useFreeAuditCount(id: number): Promise<{ used: number; daily: number }> {
    const user = await this.findById(id);
    if (!user) throw new Error('用户不存在');
    if (user.free_audit_count_used >= user.free_audit_count_daily) {
      throw new Error('今日免费审核次数已用完');
    }
    await pool.execute(
      'UPDATE users SET free_audit_count_used = free_audit_count_used + 1 WHERE id = ?',
      [id],
    );
    return { used: user.free_audit_count_used + 1, daily: user.free_audit_count_daily };
  }

  // 分页查询用户列表（超管用）
  static async findAll(page: number, pageSize: number, filters?: { role?: string; keyword?: string; status?: string }): Promise<{ list: User[]; total: number }> {
    let where = '1=1';
    const params: unknown[] = [];

    if (filters?.role) { where += ' AND role = ?'; params.push(filters.role); }
    if (filters?.status) { where += ' AND status = ?'; params.push(filters.status); }
    if (filters?.keyword) { where += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`); }

    const [countRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as count FROM users WHERE ${where}`, params);
    const total = countRows[0].count as number;

    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, email, phone, username, avatar, role, points, free_audit_count_daily, free_audit_count_used, status, created_at FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params,
    );
    return { list: rows as User[], total };
  }

  // 获取用户的员工关系
  static async findEmployeeRelation(userId: number): Promise<{ enterprise_id: number; is_admin: boolean } | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT enterprise_id, is_admin FROM employees WHERE user_id = ?',
      [userId],
    );
    return rows[0] as { enterprise_id: number; is_admin: boolean } || null;
  }
}
