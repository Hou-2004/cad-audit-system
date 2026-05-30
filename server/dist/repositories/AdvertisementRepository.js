"use strict";
// ============================================================
// 广告 Repository
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvertisementRepository = void 0;
const database_js_1 = require("../config/database.js");
class AdvertisementRepository {
    // 创建广告
    static async create(data) {
        const [result] = await database_js_1.pool.execute(`INSERT INTO advertisements (title, image_url, link_url, position, start_time, end_time, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [data.title, data.image_url, data.link_url || null, data.position, data.start_time, data.end_time, data.sort_order ?? 0]);
        return result.insertId;
    }
    // 更新广告
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
        const [result] = await database_js_1.pool.execute(`UPDATE advertisements SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
        return result.affectedRows > 0;
    }
    // 删除广告
    static async delete(id) {
        const [result] = await database_js_1.pool.execute('DELETE FROM advertisements WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    // 获取当前有效广告（按位置）
    static async getActiveByPosition(position) {
        const [rows] = await database_js_1.pool.execute(`SELECT * FROM advertisements
       WHERE position = ? AND status = 'active'
       AND start_time <= NOW() AND end_time >= NOW()
       ORDER BY sort_order ASC`, [position]);
        return rows;
    }
    // 获取所有广告（管理用）
    static async findAll(page, pageSize) {
        const [[{ total }]] = await database_js_1.pool.execute('SELECT COUNT(*) as total FROM advertisements');
        const [rows] = await database_js_1.pool.execute('SELECT * FROM advertisements ORDER BY created_at DESC LIMIT ? OFFSET ?', [pageSize, (page - 1) * pageSize]);
        return { list: rows, total };
    }
    // 增加点击数
    static async incrementClicks(id) {
        await database_js_1.pool.execute('UPDATE advertisements SET click_count = click_count + 1 WHERE id = ?', [id]);
    }
    // 增加展示数（批量）
    static async incrementImpressions(ids) {
        if (ids.length === 0)
            return;
        await database_js_1.pool.execute(`UPDATE advertisements SET impression_count = impression_count + 1 WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    }
}
exports.AdvertisementRepository = AdvertisementRepository;
