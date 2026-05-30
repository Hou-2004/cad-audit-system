"use strict";
// ============================================================
// 认证服务 - 注册、登录、JWT 管理
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = __importDefault(require("../config/index.js"));
const UserRepository_js_1 = require("../repositories/UserRepository.js");
const database_js_1 = require("../config/database.js");
class AuthService {
    /**
     * 用户注册
     */
    static async register(input) {
        // 检查邮箱是否已存在
        const existingEmail = await UserRepository_js_1.UserRepository.findByEmail(input.email);
        if (existingEmail) {
            throw new Error('该邮箱已被注册');
        }
        // 如果提供了手机号，检查是否已使用
        if (input.phone) {
            const existingPhone = await UserRepository_js_1.UserRepository.findByPhone(input.phone);
            if (existingPhone) {
                throw new Error('该手机号已被注册');
            }
        }
        // 加密密码
        const hashedPassword = await bcryptjs_1.default.hash(input.password, index_js_1.default.auth.bcryptSaltRounds);
        // 创建用户
        const userId = await UserRepository_js_1.UserRepository.create({
            email: input.email,
            phone: input.phone,
            password: hashedPassword,
            username: input.username,
            role: 'worker',
        });
        const user = await UserRepository_js_1.UserRepository.findById(userId);
        if (!user)
            throw new Error('用户创建失败');
        // 生成 Token
        const tokens = await this.generateTokens(user);
        return { user, ...tokens };
    }
    /**
     * 用户登录（支持邮箱或手机号）
     */
    static async login(input) {
        // 判断是邮箱还是手机号登录
        let user = null;
        if (input.account.includes('@')) {
            user = await UserRepository_js_1.UserRepository.findByEmail(input.account);
        }
        else {
            user = await UserRepository_js_1.UserRepository.findByPhone(input.account);
        }
        if (!user) {
            throw new Error('账号或密码错误');
        }
        if (user.status !== 'active') {
            throw new Error('账号已停用，请联系客服');
        }
        // 验证密码
        const valid = await bcryptjs_1.default.compare(input.password, user.password);
        if (!valid) {
            throw new Error('账号或密码错误');
        }
        // 更新每日重置日期（如果跨天）
        if (user.free_audit_reset_date < new Date().toISOString().split('T')[0]) {
            await UserRepository_js_1.UserRepository.update(user.id, { free_audit_count_used: 0, free_audit_reset_date: new Date().toISOString().split('T')[0] });
        }
        const tokens = await this.generateTokens(user);
        return { user, ...tokens };
    }
    /**
     * 刷新 Access Token
     */
    static async refreshAccessToken(refreshTokenString) {
        // 验证 Refresh Token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshTokenString, index_js_1.default.auth.jwtRefreshSecret);
        }
        catch {
            throw new Error('无效的刷新令牌');
        }
        // 检查 token 是否在数据库中且未撤销
        const [rows] = await database_js_1.pool.execute('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = false AND expires_at > NOW()', [Buffer.from(refreshTokenString).toString('base64')]);
        if (!rows[0]) {
            throw new Error('刷新令牌已失效，请重新登录');
        }
        const user = await UserRepository_js_1.UserRepository.findById(decoded.userId);
        if (!user || user.status !== 'active') {
            throw new Error('用户不存在或已停用');
        }
        // 撤销旧 refresh token
        await database_js_1.pool.execute('UPDATE refresh_tokens SET revoked = true WHERE id = ?', [rows[0].id]);
        // 生成新 Token 对
        const tokens = await this.generateTokens(user);
        return tokens;
    }
    /**
     * 登出 - 撤销 Refresh Token
     */
    static async logout(refreshTokenString) {
        const tokenHash = Buffer.from(refreshTokenString).toString('base64');
        await database_js_1.pool.execute('UPDATE refresh_tokens SET revoked = true WHERE token_hash = ?', [tokenHash]);
    }
    /**
     * 生成 Token 对
     */
    static async generateTokens(user) {
        const payload = { userId: user.id, role: user.role, email: user.email };
        const accessToken = jsonwebtoken_1.default.sign(payload, index_js_1.default.auth.jwtSecret, {
            expiresIn: index_js_1.default.auth.jwtExpiresIn,
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, index_js_1.default.auth.jwtRefreshSecret, {
            expiresIn: index_js_1.default.auth.jwtRefreshExpiresIn,
        });
        // 存储 Refresh Token 到数据库
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期
        await database_js_1.pool.execute(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`, [user.id, Buffer.from(refreshToken).toString('base64'), expiresAt.toISOString()]);
        return { accessToken, refreshToken };
    }
}
exports.AuthService = AuthService;
