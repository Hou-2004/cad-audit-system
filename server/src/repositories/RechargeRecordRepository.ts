// ============================================================
// 充值记录 Repository
// ============================================================

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { RechargeStatus } from '../types/index.js';

export class RechargeRecordRepository {
  static async create(data: {
    user_id: number;
    amount: number;
    points_granted: number;
    payment_method: string;
    trade_no?: string | null;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO recharge_records (user_id, amount, points_granted, payment_method, trade_no)
       VALUES (?, ?, ?, ?, ?)`,
      [data.user_id, data.amount, data.points_granted, data.payment_method, data.trade_no || null],
    );
    return result.insertId;
  }

  static async updateStatus(id: number, status: RechargeStatus): Promise<boolean> {
    const sets: string[] = ['status = ?', 'updated_at = NOW()'];
    const params: unknown[] = [status];
    if (status === 'paid') { sets.push('paid_at = NOW()'); }
    params.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE recharge_records SET ${sets.join(', ')} WHERE id = ?`, params,
    );
    return result.affectedRows > 0;
  }

  static async findByUserId(userId: number, page: number, pageSize: number): Promise<{ list: any[]; total: number }> {
    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM recharge_records WHERE user_id = ?', [userId],
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM recharge_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, (page - 1) * pageSize],
    );
    return { list: rows as any[], total };
  }

  static async findById(id: number): Promise<any> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM recharge_records WHERE id = ?', [id]);
    return rows[0] || null;
  }
}
