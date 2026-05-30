// ============================================================
// 积分记录 Repository
// ============================================================

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { PointType } from '../types/index.js';

export class PointRecordRepository {
  // 创建积分变动记录
  static async create(data: {
    user_id: number;
    amount: number;
    type: PointType;
    description?: string;
    related_id?: number | null;
    balance_after: number;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO point_records (user_id, amount, type, description, related_id, balance_after)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.user_id, data.amount, data.type, data.description || null, data.related_id || null, data.balance_after],
    );
    return result.insertId;
  }

  // 查询用户积分流水
  static async findByUserId(userId: number, page: number, pageSize: number): Promise<{ list: any[]; total: number }> {
    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM point_records WHERE user_id = ?', [userId],
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM point_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, (page - 1) * pageSize],
    );
    return { list: rows as any[], total };
  }
}
