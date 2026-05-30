"use strict";
// ============================================================
// 请求验证工具 (基于 Zod)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
const zod_1 = require("zod");
const errors_js_1 = require("../utils/errors.js");
/**
 * 验证请求体
 */
function validateBody(schema) {
    return (req, _res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const errors = err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                throw new errors_js_1.ValidationError(errors);
            }
            next(err);
        }
    };
}
/**
 * 验证查询参数
 */
function validateQuery(schema) {
    return (req, _res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const errors = err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                throw new errors_js_1.ValidationError(errors);
            }
            next(err);
        }
    };
}
