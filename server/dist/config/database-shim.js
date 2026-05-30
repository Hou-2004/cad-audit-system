"use strict";
// ============================================================
// 内存数据库兼容层 —— 模拟 mysql2/promise 的 pool 接口
// 所有数据存储在内存中，适用于开发/演示环境
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.getConnection = getConnection;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DB_FILE = path_1.default.resolve(process.cwd(), 'data', 'memory-db.json');
const tables = {};
function loadFromDisk() {
    try {
        if (fs_1.default.existsSync(DB_FILE)) {
            const raw = JSON.parse(fs_1.default.readFileSync(DB_FILE, 'utf-8'));
            Object.assign(tables, raw);
            console.log(`[内存数据库] 从磁盘加载了 ${Object.keys(tables).length} 张表`);
        }
    }
    catch { /* ignore */ }
}
function saveToDisk() {
    try {
        fs_1.default.mkdirSync(path_1.default.dirname(DB_FILE), { recursive: true });
        fs_1.default.writeFileSync(DB_FILE, JSON.stringify(tables, null, 2), 'utf-8');
    }
    catch { /* ignore */ }
}
// 启动时尝试加载
loadFromDisk();
// 定时保存
setInterval(saveToDisk, 5000);
process.on('exit', saveToDisk);
process.on('SIGINT', () => { saveToDisk(); process.exit(); });
// ---------- SQL 解析执行器（简易版） ----------
function getTable(sql) {
    // 从 SQL 中提取表名（简陋但够用）
    const match = sql.match(/\bFROM\s+(\w+)/i)
        || sql.match(/\bINTO\s+(\w+)/i)
        || sql.match(/\bUPDATE\s+(\w+)/i)
        || sql.match(/\bDELETE\s+FROM\s+(\w+)/i);
    return match ? match[1] : null;
}
function parseValues(sql) {
    // 提取 VALUES (?, ?, ?) 中的 ? 数量
    const count = (sql.match(/\?/g) || []).length;
    return new Array(count).fill(null);
}
// 简易 WHERE 解析
function buildWhere(conditions, params) {
    // 只支持简单的 AND 条件：col = ? 或 col IS NULL
    const parts = conditions.split(/\s+AND\s+/i);
    const resultFns = [];
    let paramIdx = 0;
    for (const part of parts) {
        const eqMatch = part.match(/^(\w+)\s*=\s*\?$/i);
        if (eqMatch) {
            const col = eqMatch[1];
            const val = params[paramIdx++];
            resultFns.push(row => String(row[col]) === String(val));
            continue;
        }
        const nullMatch = part.match(/^(\w+)\s+IS\s+NULL$/i);
        if (nullMatch) {
            const col = nullMatch[1];
            resultFns.push(row => row[col] === null || row[col] === undefined);
            continue;
        }
        // fallback: skip
    }
    return row => resultFns.every(fn => fn(row));
}
// 简易 SELECT 解析
function execSelect(sql, params) {
    const table = getTable(sql);
    if (!table || !tables[table])
        return { rows: [], fields: [] };
    let rows = [...tables[table]];
    // WHERE
    const whereIdx = sql.toUpperCase().indexOf('WHERE');
    if (whereIdx !== -1) {
        let whereClause = sql.substring(whereIdx + 5);
        const limitIdx = whereClause.toUpperCase().indexOf('LIMIT');
        const orderIdx = whereClause.toUpperCase().indexOf('ORDER');
        const end = Math.min(limitIdx === -1 ? Infinity : limitIdx, orderIdx === -1 ? Infinity : orderIdx);
        whereClause = whereClause.substring(0, end).trim();
        if (whereClause) {
            const filter = buildWhere(whereClause, params);
            rows = rows.filter(filter);
        }
    }
    // ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(\s+(ASC|DESC))?/i);
    if (orderMatch) {
        const col = orderMatch[1];
        const desc = orderMatch[2]?.toUpperCase() === 'DESC';
        rows.sort((a, b) => {
            const cmp = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
            return desc ? -cmp : cmp;
        });
    }
    // LIMIT / OFFSET
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    if (limitMatch) {
        const limit = parseInt(limitMatch[1], 10);
        const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
        rows = rows.slice(offset, offset + limit);
    }
    return { rows, fields: Object.keys(rows[0] || {}).map(k => ({ name: k })) };
}
// 简易 INSERT
function execInsert(sql, params) {
    const table = getTable(sql);
    if (!table)
        return { insertId: 0 };
    if (!tables[table])
        tables[table] = [];
    // 解析列名
    const colMatch = sql.match(/INSERT\s+INTO\s+\w+\s+\(([^)]+)\)/i);
    const columns = colMatch ? colMatch[1].split(',').map(c => c.trim()) : [];
    const row = {};
    let paramIdx = 0;
    for (const col of columns) {
        if (col === 'id' || col === 'created_at' || col === 'updated_at')
            continue;
        row[col] = params[paramIdx++];
    }
    // 自动分配 ID
    const maxId = tables[table].reduce((max, r) => Math.max(max, r.id || 0), 0);
    row.id = maxId + 1;
    row.created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    row.updated_at = row.created_at;
    tables[table].push(row);
    return { insertId: row.id };
}
// 简易 UPDATE
function execUpdate(sql, params) {
    const table = getTable(sql);
    if (!table || !tables[table])
        return { affectedRows: 0 };
    // 解析 SET
    const setMatch = sql.match(/SET\s+([^WHERE]+)/i);
    const setPairs = setMatch ? setMatch[1].split(',').map(s => s.trim()) : [];
    const setValues = {};
    let paramIdx = 0;
    for (const pair of setPairs) {
        const [col] = pair.split('=').map(s => s.trim());
        setValues[col] = params[paramIdx++];
    }
    // WHERE
    let affected = 0;
    const whereIdx = sql.toUpperCase().indexOf('WHERE');
    if (whereIdx !== -1) {
        let whereClause = sql.substring(whereIdx + 5).trim();
        const filter = buildWhere(whereClause, params.slice(paramIdx));
        for (const row of tables[table]) {
            if (filter(row)) {
                Object.assign(row, setValues);
                row.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
                affected++;
            }
        }
    }
    return { affectedRows: affected };
}
class PreparedStatement {
    sql;
    constructor(sql) {
        this.sql = sql;
    }
    async execute(params) {
        return execute(this.sql, params);
    }
}
async function execute(sql, params = []) {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('SHOW')) {
        const { rows, fields } = execSelect(sql, params);
        return [rows, fields];
    }
    if (upper.startsWith('INSERT')) {
        const { insertId } = execInsert(sql, params);
        const header = {
            fieldCount: 0, affectedRows: 1, insertId,
            serverStatus: 2, warningCount: 0, message: '', protocol41: true, changedRows: 0,
        };
        return [header, []];
    }
    if (upper.startsWith('UPDATE')) {
        const { affectedRows } = execUpdate(sql, params);
        const header = {
            fieldCount: 0, affectedRows, insertId: 0,
            serverStatus: 2, warningCount: 0, message: '', protocol41: true, changedRows: affectedRows,
        };
        return [header, []];
    }
    if (upper.startsWith('DELETE')) {
        const table = getTable(sql);
        let deleted = 0;
        if (table && tables[table]) {
            const whereIdx = sql.toUpperCase().indexOf('WHERE');
            if (whereIdx !== -1) {
                const whereClause = sql.substring(whereIdx + 5).trim();
                const filter = buildWhere(whereClause, params);
                const before = tables[table].length;
                tables[table] = tables[table].filter(r => !filter(r));
                deleted = before - tables[table].length;
            }
        }
        const header = {
            fieldCount: 0, affectedRows: deleted, insertId: 0,
            serverStatus: 2, warningCount: 0, message: '', protocol41: true, changedRows: deleted,
        };
        return [header, []];
    }
    if (upper.startsWith('CREATE TABLE') || upper.startsWith('DROP') || upper.startsWith('ALTER')) {
        return [{ fieldCount: 0, affectedRows: 0, insertId: 0, serverStatus: 2, warningCount: 0, message: '', protocol41: true, changedRows: 0 }, []];
    }
    // 兜底
    return [[], []];
}
// getConnection / connect
async function getConnection() {
    return {
        execute: (sql, params) => execute(sql, params || []),
        query: (sql, params) => execute(sql, params || []),
        release: () => { },
        beginTransaction: async () => { },
        commit: async () => { },
        rollback: async () => { },
    };
}
const pool = {
    execute: (sql, params) => execute(sql, params || []),
    query: (sql, params) => execute(sql, params || []),
    getConnection,
};
exports.pool = pool;
// ---------- 初始化预设数据 ----------
function initPresetData() {
    if (!tables.users || tables.users.length === 0) {
        const now = new Date();
        const ts = () => now.toISOString().slice(0, 19).replace('T', ' ');
        const date = () => now.toISOString().slice(0, 10);
        // 统一密码哈希: Cad@2026
        const pwd = '$2a$12$HcuYPWQ07zUwjPMtH0vYt.Lu8QilVtQbQKSPaO6vmk7kPqEqissvu';
        tables.users = [
            // ====== 1. 高级管理员 ======
            {
                id: 1,
                email: 'admin@cad-audit.com',
                phone: '13800000001',
                password: pwd,
                username: '系统管理员',
                avatar: null,
                role: 'super_admin',
                points: 99999,
                free_audit_count_daily: 99,
                free_audit_count_used: 0,
                free_audit_reset_date: date(),
                status: 'active',
                created_at: ts(),
                updated_at: ts(),
            },
            // ====== 2~4. 工作者账号 ======
            {
                id: 2,
                email: 'worker1@cad-audit.com',
                phone: '13800000002',
                password: pwd,
                username: '张三',
                avatar: null,
                role: 'worker',
                points: 200,
                free_audit_count_daily: 3,
                free_audit_count_used: 0,
                free_audit_reset_date: date(),
                status: 'active',
                enterprise_id: null,
                created_at: ts(),
                updated_at: ts(),
            },
            {
                id: 3,
                email: 'worker2@cad-audit.com',
                phone: '13800000003',
                password: pwd,
                username: '李四',
                avatar: null,
                role: 'worker',
                points: 150,
                free_audit_count_daily: 3,
                free_audit_count_used: 0,
                free_audit_reset_date: date(),
                status: 'active',
                enterprise_id: null,
                created_at: ts(),
                updated_at: ts(),
            },
            {
                id: 4,
                email: 'worker3@cad-audit.com',
                phone: '13800000004',
                password: pwd,
                username: '王五',
                avatar: null,
                role: 'worker',
                points: 180,
                free_audit_count_daily: 3,
                free_audit_count_used: 0,
                free_audit_reset_date: date(),
                status: 'active',
                enterprise_id: null,
                created_at: ts(),
                updated_at: ts(),
            },
        ];
        console.log(`[内存数据库] 已初始化 ${tables.users.length} 个预设用户 (1管理员 + 3工作者)`);
    }
    if (!tables.audit_rules || tables.audit_rules.length === 0) {
        tables.audit_rules = [
            { id: 1, name: '图层命名规范检查', category: 'layer', description: '检查CAD文件中图层的命名是否符合企业规范', rule_config: JSON.stringify({ pattern: '^[a-zA-Z][a-zA-Z0-9_]{2,15}$', maxLayers: 50 }), is_preset: 1, creator_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 2, name: '禁止冻结图层检查', category: 'layer', description: '扫描是否存在被冻结的关键图层', rule_config: JSON.stringify({ forBiddenFrozen: ['0', 'DEFPOINTS', '轮廓'] }), is_preset: 1, creator_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 3, name: '线型规范检查', category: 'linetype', description: '检查使用的线型是否在允许列表内', rule_config: JSON.stringify({ allowedLinetypes: ['Continuous', 'DASHED', 'CENTER', 'PHANTOM'] }), is_preset: 1, creator_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 4, name: '颜色规范检查 (ACI)', category: 'color', description: '检查颜色索引(ACI)是否在规定范围内', rule_config: JSON.stringify({ allowedRange: [1, 7], customColors: [] }), is_preset: 1, creator_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 5, name: '尺寸标注完整性', category: 'dimension', description: '检查关键尺寸标注是否存在且完整', rule_config: JSON.stringify({ requireLinear: true, requireRadial: false, requireAngular: false }), is_preset: 1, creator_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 6, name: '文字样式一致性', category: 'text_style', description: '检查文字高度、字体、对齐方式等', rule_config: JSON.stringify({ minHeight: 2.5, fonts: ['SIMHEI', 'TXT.SHX'], checkAlignment: true }), is_preset: 1, creator_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 7, name: '标题栏完整性', category: 'title_block', description: '检查图框和标题栏信息是否齐全', rule_config: JSON.stringify({ requireDrawingNumber: true, requireTitle: true, requireScale: true, requireDate: true }), is_preset: 1, creator_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ];
        console.log('[内存数据库] 已初始化预设审核规则');
    }
    if (!tables.subscription_tiers || tables.subscription_tiers.length === 0) {
        tables.subscription_tiers = [
            { id: 1, name: '基础版', code: 'small', price_yearly: 288.00, daily_task_limit: 20, description: '适合小型团队或个人工作室', features: JSON.stringify(['每日20次审核任务', '3个免费员工名额', '基础审核规则库']), sort_order: 1, is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 2, name: '专业版', code: 'medium', price_yearly: 588.00, daily_task_limit: 50, description: '适合中型设计团队', features: JSON.stringify(['每日50次审核任务', '3个免费员工名额', '全部审核规则库', '自定义规则支持', '优先技术支持']), sort_order: 2, is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 3, name: '企业版', code: 'large', price_yearly: 1088.00, daily_task_limit: 0, description: '适合大型企业，无任务限制', features: JSON.stringify(['无限审核任务', '3个免费员工名额', '全部审核规则库+自定义', '专属技术支持', 'API接口访问']), sort_order: 3, is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ];
        console.log('[内存数据库] 已初始化套餐等级数据');
    }
    saveToDisk();
}
initPresetData();
exports.default = { pool, getConnection };
