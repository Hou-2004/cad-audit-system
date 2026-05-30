"use strict";
// ============================================================
// 任务管理控制器
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const TaskService_js_1 = require("../services/TaskService.js");
const response_js_1 = require("../utils/response.js");
class TaskController {
    // 创建任务
    static async create(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.user?.enterpriseId || req.body.enterprise_id || req.params.enterpriseId);
        if (!enterpriseId) {
            res.status(400).json({ code: 400, message: '缺少企业ID', data: null });
            return;
        }
        try {
            const taskId = await TaskService_js_1.TaskService.createTask(adminId, enterpriseId, {
                title: req.body.title,
                description: req.body.description,
                spec_requirements: req.body.spec_requirements,
                selected_rule_ids: req.body.selected_rule_ids,
                target_user_ids: req.body.target_user_ids,
                priority: req.body.priority || 'medium',
                deadline: req.body.deadline,
            });
            (0, response_js_1.success)(res, { id: taskId }, '任务创建成功', 201);
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 更新任务
    static async update(req, res) {
        const adminId = req.user?.userId;
        const taskId = parseInt(req.params.id);
        try {
            await TaskService_js_1.TaskService.updateTask(taskId, adminId, req.body);
            (0, response_js_1.success)(res, null, '任务更新成功');
        }
        catch (err) {
            const code = err.message.includes('不存在') ? 404 : err.message.includes('无权') ? 403 : 400;
            res.status(code).json({ code, message: err.message, data: null });
        }
    }
    // 删除任务
    static async delete(req, res) {
        const adminId = req.user?.userId;
        const taskId = parseInt(req.params.id);
        try {
            await TaskService_js_1.TaskService.deleteTask(taskId, adminId);
            (0, response_js_1.success)(res, null, '任务已删除');
        }
        catch (err) {
            res.status(err.message.includes('无权') ? 403 : 404).json({ code: 404, message: err.message, data: null });
        }
    }
    // 企业任务列表（管理员）
    static async listEnterpriseTasks(req, res) {
        const adminId = req.user?.userId;
        const enterpriseId = parseInt(req.params.enterpriseId);
        const page = parseInt(req.query.page) || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
        try {
            const result = await TaskService_js_1.TaskService.getEnterpriseTasks(enterpriseId, adminId, page, pageSize, req.query.status);
            (0, response_js_1.paginated)(res, result.list, result.total, page, pageSize);
        }
        catch (err) {
            res.status(403).json({ code: 403, message: err.message, data: null });
        }
    }
    // 我的任务列表（员工）
    static async listMyTasks(req, res) {
        const userId = req.user?.userId;
        const page = parseInt(req.query.page) || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
        const tasks = await TaskService_js_1.TaskService.getUserTasks(userId, page, pageSize);
        (0, response_js_1.success)(res, tasks);
    }
    // 更新任务分配状态（员工完成/跳过）
    static async updateStatus(req, res) {
        const userId = req.user?.userId;
        const taskId = parseInt(req.params.id);
        const { status, notes } = req.body;
        if (!status) {
            res.status(400).json({ code: 400, message: '缺少状态参数', data: null });
            return;
        }
        try {
            await TaskService_js_1.TaskService.updateAssignmentStatus(taskId, userId, status, notes);
            (0, response_js_1.success)(res, null, '状态已更新');
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
}
exports.TaskController = TaskController;
