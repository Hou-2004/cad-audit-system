"use strict";
// ============================================================
// 统一响应格式
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.paginated = paginated;
exports.createResponse = createResponse;
/**
 * 发送成功响应
 */
function success(res, data, message = '操作成功', statusCode = 200) {
    const body = {
        code: statusCode,
        message,
        data,
        timestamp: Date.now(),
    };
    return res.status(statusCode).json(body);
}
/**
 * 发送分页响应
 */
function paginated(res, list, total, page, pageSize, message = '查询成功') {
    return success(res, {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    }, message);
}
/**
 * 创建响应辅助对象（不直接发送，供其他地方使用）
 */
function createResponse(data, message = '操作成功', code = 200) {
    return { code, message, data, timestamp: Date.now() };
}
