// ============================================================
// 广告 Repository
// ============================================================

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { AdPosition, AdStatus } from '../types/index.js';

export class AdvertisementRepository {
  // 创建广告
  static async create(data: {
    title: string;
    image_url: string;
    link_url?: string | null;
    position: AdPosition;
    start_time: string;
    end_time: string;
    sort_order?: number;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO advertisements (title, image_url, link_url, position, start_time, end_time, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.title, data.image_url, data.link_url || null, data.position, data.start_time, data.end_time, data.sort_order ?? 0],
    );
    return result.insertId;
  }

  // 更新广告
  static async update(id: number, fields: Partial<{
    title: string; image_url: string; link_url: string;
    position: AdPosition; start_time: string; end_time: string;
    sort_order: number; status: AdStatus;
  }>): Promise<boolean> {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) { sets.push(`${key} = ?`); values.push(value); }
    }
    if (sets.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE advertisements SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values,
    );
    return result.affectedRows > 0;
  }

  // 删除广告
  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM advertisements WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // 获取当前有效广告（按位置）
  static async getActiveByPosition(position: AdPosition): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM advertisements
       WHERE position = ? AND status = 'active'
       AND start_time <= NOW() AND end_time >= NOW()
       ORDER BY sort_order ASC`,
      [position],
    );
    return rows as any[];
  }

  // 获取所有广告（管理用）
  static async findAll(page: number, pageSize: number): Promise<{ list: any[]; total: number }> {
    const [[{ total }]] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) as total FROM advertisements');
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM advertisements ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [pageSize, (page - 1) * pageSize],
    );
    return { list: rows as any[], total };
  }

  // 增加点击数
  static async incrementClicks(id: number): Promise<void> {
    await pool.execute('UPDATE advertisements SET click_count = click_count + 1 WHERE id = ?', [id]);
  }

  // 增加展示数（批量）
  static async incrementImpressions(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await pool.execute(
      `UPDATE advertisements SET impression_count = impression_count + 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  }
}
