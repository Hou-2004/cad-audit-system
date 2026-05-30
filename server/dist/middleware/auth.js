"use strict";
// ============================================================
// JWT 认证中间件
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = __importDefault(require("../config/index.js"));
const errors_js_1 = require("../utils/errors.js");
/**
 * JWT 认证中间件 - 验证 Access Token
 */
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new errors_js_1.UnauthorizedError('缺少认证令牌');
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.default.auth.jwtSecret);
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            email: decoded.email,
        };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_js_1.UnauthorizedError('登录已过期，请重新登录');
        }
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new errors_js_1.UnauthorizedError('无效的认证令牌');
        }
        throw new errors_js_1.UnauthorizedError('认证失败');
    }
}
/**
 * 角色授权中间件 - 检查用户角色是否匹配
 */
function authorize(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            throw new errors_js_1.UnauthorizedError();
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw new errors_js_1.ForbiddenError(`需要 ${allowedRoles.join('/')} 权限`);
        }
        next();
    };
}
/**
 * 可选认证 - 不强制要求登录，但如果提供了token则解析
 */
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jsonwebtoken_1.default.verify(token, index_js_1.default.auth.jwtSecret);
            req.user = {
                userId: decoded.userId,
                role: decoded.role,
                email: decoded.email,
            };
        }
        catch {
            // 忽略无效token
        }
    }
    next();
}
