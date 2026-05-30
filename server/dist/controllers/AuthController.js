"use strict";
// ============================================================
// 认证控制器
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.authSchemas = exports.AuthController = void 0;
const zod_1 = require("zod");
const AuthService_js_1 = require("../services/AuthService.js");
const response_js_1 = require("../utils/response.js");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('请输入有效的邮箱地址'),
    password: zod_1.z.string().min(6, '密码至少6位').max(50),
    username: zod_1.z.string().min(2).max(30),
    phone: zod_1.z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional(),
});
const loginSchema = zod_1.z.object({
    account: zod_1.z.string().min(1).max(100), // 邮箱或手机号
    password: zod_1.z.string().min(1),
});
class AuthController {
    static register(req, res) {
        const input = req.body;
        AuthService_js_1.AuthService.register(input)
            .then((result) => {
            const { password: _p, ...user } = result.user;
            (0, response_js_1.success)(res, { user, accessToken: result.accessToken, refreshToken: result.refreshToken }, '注册成功', 201);
        })
            .catch((err) => {
            res.status(400).json({ code: 400, message: err.message, data: null });
        });
    }
    static login(req, res) {
        const input = req.body;
        AuthService_js_1.AuthService.login(input)
            .then((result) => {
            const { password: _p, ...user } = result.user;
            (0, response_js_1.success)(res, { user, accessToken: result.accessToken, refreshToken: result.refreshToken }, '登录成功');
        })
            .catch((err) => {
            res.status(401).json({ code: 401, message: err.message, data: null });
        });
    }
    static async refresh(req, res) {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ code: 400, message: '缺少刷新令牌', data: null });
            return;
        }
        try {
            const tokens = await AuthService_js_1.AuthService.refreshAccessToken(refreshToken);
            (0, response_js_1.success)(res, tokens);
        }
        catch (err) {
            res.status(401).json({ code: 401, message: err.message, data: null });
        }
    }
    static async logout(req, res) {
        const { refreshToken } = req.body;
        if (refreshToken)
            await AuthService_js_1.AuthService.logout(refreshToken);
        (0, response_js_1.success)(res, null, '已退出登录');
    }
}
exports.AuthController = AuthController;
exports.authSchemas = { registerSchema, loginSchema };
