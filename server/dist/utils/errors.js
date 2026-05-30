"use strict";
// ============================================================
// 自定义错误类 - 类型化错误体系
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    code;
    statusCode;
    isOperational;
    constructor(message, code, statusCode, isOperational = true) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// 404 未找到
class NotFoundError extends AppError {
    constructor(resource, id) {
        super(id ? `${resource} 不存在 (ID: ${id})` : `${resource} 不存在`, 'NOT_FOUND', 404);
    }
}
exports.NotFoundError = NotFoundError;
// 400 参数校验失败
class ValidationError extends AppError {
    errors;
    constructor(errors) {
        super('请求参数验证失败', 'VALIDATION_ERROR', 422);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
// 401 未认证
class UnauthorizedError extends AppError {
    constructor(message = '未登录或登录已过期') {
        super(message, 'UNAUTHORIZED', 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
// 403 无权限
class ForbiddenError extends AppError {
    constructor(message = '没有权限执行此操作') {
        super(message, 'FORBIDDEN', 403);
    }
}
exports.ForbiddenError = ForbiddenError;
// 409 冲突
class ConflictError extends AppError {
    constructor(message) {
        super(message, 'CONFLICT', 409);
    }
}
exports.ConflictError = ConflictError;
// 业务逻辑错误
class BusinessError extends AppError {
    constructor(message, code = 'BUSINESS_ERROR') {
        super(message, code, 400);
    }
}
exports.BusinessError = BusinessError;
