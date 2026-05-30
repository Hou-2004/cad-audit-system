"use strict";
// ============================================================
// 全局错误处理中间件
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_js_1 = require("../utils/errors.js");
const isDev = process.env.NODE_ENV !== 'production';
function errorHandler(err, req, res, _next) {
    const requestId = req.id || 'unknown';
    // 处理已知的操作错误
    if (err instanceof errors_js_1.AppError && err.isOperational) {
        res.status(err.statusCode).json({
            code: err.statusCode,
            message: err.message,
            data: null,
            error: { type: err.code, requestId },
            timestamp: Date.now(),
        });
        return;
    }
    // 处理 Multer 文件上传错误
    if (err.name === 'MulterError') {
        const multerErr = err;
        let message = '文件上传失败';
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
            message = '文件大小超出限制（最大100MB）';
        }
        else if (multerErr.code === 'LIMIT_FILE_COUNT') {
            message = '文件数量超出限制';
        }
        else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
            message = '意外的文件字段';
        }
        res.status(400).json({
            code: 400,
            message,
            data: null,
            error: { type: 'UPLOAD_ERROR', requestId },
            timestamp: Date.now(),
        });
        return;
    }
    // JSON 解析错误
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
            code: 400,
            message: '请求数据格式无效(JSON)',
            data: null,
            error: { type: 'INVALID_JSON', requestId },
            timestamp: Date.now(),
        });
        return;
    }
    // 未知错误 - 不暴露内部细节
    console.error(`[错误] ${requestId}:`, {
        error: err.message,
        stack: isDev ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });
    res.status(500).json({
        code: 500,
        message: isDev ? (err.message || '服务器内部错误') : '服务器内部错误，请稍后重试',
        data: null,
        error: { type: 'INTERNAL_ERROR', requestId },
        timestamp: Date.now(),
    });
}
