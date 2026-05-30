"use strict";
// ============================================================
// 企业管理控制器
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
exports.EnterpriseController = void 0;
const EnterpriseService_js_1 = require("../services/EnterpriseService.js");
const response_js_1 = require("../utils/response.js");
class EnterpriseController {
    // 创建企业
    static async create(req, res) {
        const userId = req.user?.userId;
        const { name, description } = req.body;
        if (!name) {
            res.status(400).json({ code: 400, message: '企业名称不能为空', data: null });
            return;
        }
        try {
            const result = await EnterpriseService_js_1.EnterpriseService.createEnterprise(userId, name, description);
            (0, response_js_1.success)(res, result, '企业创建成功', 201);
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 获取企业详情
    static async getDetail(req, res) {
        try {
            const enterpriseId = parseInt(req.params.id);
            const user = req.user;
            const result = await EnterpriseService_js_1.EnterpriseService.getEnterpriseDetail(enterpriseId, user?.role, user?.userId);
            (0, response_js_1.success)(res, result);
        }
        catch (err) {
            res.status(404).json({ code: 404, message: err.message, data: null });
        }
    }
    // 获取我的企业（当前用户的企业）
    static async getMyEnterprise(req, res) {
        const userId = req.user?.userId;
        const { EmployeeRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/EmployeeRepository.js')));
        const emp = await EmployeeRepository.findByUserId(userId);
        if (emp) {
            const result = await EnterpriseService_js_1.EnterpriseService.getEnterpriseDetail(emp.enterprise_id);
            (0, response_js_1.success)(res, result);
        }
        else {
            (0, response_js_1.success)(res, null);
        }
    }
    // 绑定员工
    static async bindEmployee(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.params.enterpriseId);
        const { account } = req.body; // 邮箱或手机号
        if (!account) {
            res.status(400).json({ code: 400, message: '请提供用户邮箱或手机号', data: null });
            return;
        }
        try {
            const result = await EnterpriseService_js_1.EnterpriseService.bindEmployee(enterpriseId, adminId, account);
            (0, response_js_1.success)(res, result, '绑定成功');
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 踢出员工
    static async removeEmployee(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.params.enterpriseId);
        const employeeUserId = parseInt(req.params.userId);
        try {
            await EnterpriseService_js_1.EnterpriseService.removeEmployee(enterpriseId, adminId, employeeUserId);
            (0, response_js_1.success)(res, null, '已移除该员工');
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 提升为管理员
    static async promoteAdmin(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.params.enterpriseId);
        const targetUserId = parseInt(req.params.userId);
        try {
            await EnterpriseService_js_1.EnterpriseService.promoteToAdmin(enterpriseId, adminId, targetUserId);
            (0, response_js_1.success)(res, null, '已提升为管理员');
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 直接注册新员工
    static async directRegister(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.params.enterpriseId);
        const { email, username, password } = req.body;
        if (!email || !username || !password) {
            res.status(400).json({ code: 400, message: '请填写完整信息', data: null });
            return;
        }
        try {
            const user = await EnterpriseService_js_1.EnterpriseService.directRegisterEmployee(enterpriseId, adminId, { email, username, password });
            const { password: _p, ...userInfo } = user;
            (0, response_js_1.success)(res, userInfo, '员工注册成功', 201);
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 兑换员工名额
    static async exchangeSlots(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.params.enterpriseId);
        const { count } = req.body;
        if (!count || count < 1) {
            res.status(400).json({ code: 400, message: '数量需大于0', data: null });
            return;
        }
        try {
            await EnterpriseService_js_1.EnterpriseService.exchangeEmployeeSlots(enterpriseId, adminId, Math.floor(count));
            (0, response_js_1.success)(res, null, `成功兑换 ${count} 个员工注册名额`);
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 获取员工列表
    static async getEmployees(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.params.enterpriseId);
        try {
            const employees = await EnterpriseService_js_1.EnterpriseService.getEmployees(enterpriseId, adminId);
            (0, response_js_1.success)(res, employees);
        }
        catch (err) {
            res.status(403).json({ code: 403, message: err.message, data: null });
        }
    }
}
exports.EnterpriseController = EnterpriseController;
