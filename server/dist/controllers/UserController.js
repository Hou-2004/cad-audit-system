"use strict";
// ============================================================
// 用户管理控制器（超管）
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserRepository_js_1 = require("../repositories/UserRepository.js");
const response_js_1 = require("../utils/response.js");
class UserController {
    // 获取当前用户信息
    static async me(req, res) {
        const userId = req.user?.userId;
        const user = await UserRepository_js_1.UserRepository.findById(userId);
        if (!user) {
            res.status(404).json({ code: 404, message: '用户不存在', data: null });
            return;
        }
        // 不返回密码
        const { password: _p, ...userInfo } = user;
        // 附加企业信息
        try {
            const { EmployeeRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/EmployeeRepository.js')));
            const emp = await EmployeeRepository.findByUserId(userId);
            if (emp) {
                userInfo.enterprise_id = emp.enterprise_id;
                userInfo.is_enterprise_admin = emp.is_admin;
                const { EnterpriseRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/EnterpriseRepository.js')));
                const ent = await EnterpriseRepository.findById(emp.enterprise_id);
                if (ent)
                    userInfo.enterprise_name = ent.name;
            }
        }
        catch { }
        (0, response_js_1.success)(res, userInfo);
    }
    // 更新当前用户信息
    static async updateMe(req, res) {
        const userId = req.user?.userId;
        const allowedFields = ['username', 'avatar'];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined)
                updateData[field] = req.body[field];
        }
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ code: 400, message: '没有可更新的字段', data: null });
            return;
        }
        await UserRepository_js_1.UserRepository.update(userId, updateData);
        const user = await UserRepository_js_1.UserRepository.findById(userId);
        const { password: _p, ...userInfo } = user;
        (0, response_js_1.success)(res, userInfo, '更新成功');
    }
    // 用户列表（超管）
    static async list(req, res) {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 20, 1), 100);
        const filters = {};
        if (req.query.role)
            filters.role = req.query.role;
        if (req.query.status)
            filters.status = req.query.status;
        if (req.query.keyword)
            filters.keyword = req.query.keyword;
        const result = await UserRepository_js_1.UserRepository.findAll(page, pageSize, filters);
        result.list.forEach((u) => delete u.password);
        (0, response_js_1.paginated)(res, result.list, result.total, page, pageSize);
    }
    // 禁用/启用用户（超管）
    static async toggleStatus(req, res) {
        const targetId = parseInt(req.params.id);
        const newStatus = req.body.status === 'disabled' ? 'disabled' : 'active';
        const user = await UserRepository_js_1.UserRepository.findById(targetId);
        if (!user) {
            res.status(404).json({ code: 404, message: '用户不存在', data: null });
            return;
        }
        if (user.role === 'super_admin') {
            res.status(403).json({ code: 403, message: '不能操作超级管理员', data: null });
            return;
        }
        await UserRepository_js_1.UserRepository.update(targetId, { status: newStatus });
        (0, response_js_1.success)(res, null, `用户已${newStatus === 'disabled' ? '禁用' : '启用'}`);
    }
    // 调整积分（超管）
    static async adjustPoints(req, res) {
        const targetId = parseInt(req.params.id);
        const amount = parseInt(req.body.amount); // 正=增加，负=扣减
        const reason = req.body.reason || '管理员调整';
        if (!amount || amount === 0) {
            res.status(400).json({ code: 400, message: '请输入有效的积分数额', data: null });
            return;
        }
        const user = await UserRepository_js_1.UserRepository.findById(targetId);
        if (!user) {
            res.status(404).json({ code: 404, message: '用户不存在', data: null });
            return;
        }
        let balanceAfter;
        if (amount > 0) {
            balanceAfter = await UserRepository_js_1.UserRepository.addPoints(targetId, amount);
        }
        else {
            try {
                balanceAfter = await UserRepository_js_1.UserRepository.deductPoints(targetId, Math.abs(amount));
            }
            catch (err) {
                res.status(400).json({ code: 400, message: err.message, data: null });
                return;
            }
        }
        // 记录
        const { PointRecordRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/PointRecordRepository.js')));
        await PointRecordRepository.create({
            user_id: targetId,
            amount,
            type: 'admin_adjust',
            description: reason,
            balance_after: balanceAfter,
        });
        (0, response_js_1.success)(res, { balanceAfter }, '积分调整成功');
    }
}
exports.UserController = UserController;
