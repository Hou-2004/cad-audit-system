// ============================================================
// 审核规则 Repository
// ============================================================

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { RuleCategory } from '../types/index.js';

export class AuditRuleRepository {
  // 根据ID查找
  static async findById(id: number): Promise<any> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM audit_rules WHERE id = ?', [id]);
    return rows[0] || null;
  }

  // 获取所有活跃规则
  static async findActive(category?: RuleCategory): Promise<any[]> {
    let sql = 'SELECT * FROM audit_rules WHERE status = "active"';
    const params: unknown[] = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY is_preset DESC, created_at ASC';
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows as any[];
  }

  // 获取预设规则
  static async findPreset(): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM audit_rules WHERE is_preset = true AND status = "active" ORDER BY category, name',
    );
    return rows as any[];
  }

  // 获取用户自定义规则
  static async findByCreator(creatorId: number): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM audit_rules WHERE creator_id = ? AND status = "active" ORDER BY created_at DESC',
      [creatorId],
    );
    return rows as any[];
  }

  // 创建自定义规则
  static async create(data: {
    name: string;
    category: string;
    description?: string;
    rule_config: Record<string, unknown>;
    creator_id: number;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO audit_rules (name, category, description, rule_config, is_preset, creator_id)
       VALUES (?, ?, ?, ?, false, ?)`,
      [data.name, data.category, data.description || null, JSON.stringify(data.rule_config), data.creator_id],
    );
    return result.insertId;
  }

  // 批量获取规则（根据ID列表）
  static async findByIds(ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM audit_rules WHERE id IN (${ids.map(() => '?').join(',')}) AND status = "active"`,
      ids,
    );
    return rows as any[];
  }
}
