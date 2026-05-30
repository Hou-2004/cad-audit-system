// ============================================================
// 审核规则 Repository
// ============================================================

import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { AuditRule, RuleCategory } from '../types/index.js';

export class AuditRuleRepository {
  // 根据ID列表查找规则
  static async findByIds(ids: number[]): Promise<AuditRule[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM audit_rules WHERE id IN (${placeholders}) AND status = 'active' ORDER BY id`,
      ids,
    );
    return rows as AuditRule[];
  }

  // 查找所有预设规则
  static async findPreset(): Promise<AuditRule[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM audit_rules WHERE is_preset = 1 AND status = 'active' ORDER BY category, id`,
    );
    return rows as AuditRule[];
  }

  // 分页查询（管理员用）
  static async findWithFilters(filters: {
    category?: RuleCategory | null;
    isPreset?: boolean | null;
    status?: string | null;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: AuditRule[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

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

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM audit_rules ${whereClause}`, values,
    );
    const total = (countRows[0].total as number) || 0;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM audit_rules ${whereClause} ORDER BY id LIMIT ? OFFSET ?`,
      [...values, pageSize, offset],
    );

    return { list: rows as AuditRule[], total };
  }

  // 创建自定义规则
  static async create(data: {
    name: string;
    category: RuleCategory;
    description?: string | null;
    rule_config: Record<string, unknown>;
    creator_id: number;
    is_preset?: boolean;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO audit_rules (name, category, description, rule_config, is_preset, creator_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [data.name, data.category, data.description || null,
        JSON.stringify(data.rule_config), data.is_preset ? 1 : 0, data.creator_id],
    );
    return result.insertId;
  }

  // 更新规则
  static async update(id: number, data: {
    name?: string;
    category?: RuleCategory;
    description?: string | null;
    rule_config?: Record<string, unknown>;
    status?: string;
  }): Promise<boolean> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.rule_config !== undefined) { fields.push('rule_config = ?'); values.push(JSON.stringify(data.rule_config)); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE audit_rules SET ${fields.join(', ')} WHERE id = ?`, values,
    );
    return true;
  }

  // 根据ID查找单条
  static async findById(id: number): Promise<AuditRule | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM audit_rules WHERE id = ?', [id],
    );
    return (rows[0] as AuditRule) || null;
  }
}

import { ResultSetHeader } from 'mysql2/promise';
