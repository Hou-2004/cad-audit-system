"use strict";
// ============================================================
// 企业管理服务
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_js_1 = __importDefault(require("../config/index.js"));
const EnterpriseRepository_js_1 = require("../repositories/EnterpriseRepository.js");
const EmployeeRepository_js_1 = require("../repositories/EmployeeRepository.js");
const UserRepository_js_1 = require("../repositories/UserRepository.js");
const PointRecordRepository_js_1 = require("../repositories/PointRecordRepository.js");
class EnterpriseService {
    /**
     * 创建企业（工作者注册成为企业管理员）— 需同时选择套餐并支付
     * @param tierId 选定的套餐ID（支付成功后由 SubscriptionService 激活）
     */
    static async createEnterprise(adminUserId, name, description, tierId) {
        // 检查用户是否已有企业
        const existing = await EnterpriseRepository_js_1.EnterpriseRepository.findByAdminId(adminUserId);
        if (existing) {
            throw new Error('您已创建过企业，每个用户只能创建一个企业');
        }
        // 检查用户角色
        const user = await UserRepository_js_1.UserRepository.findById(adminUserId);
        if (!user)
            throw new Error('用户不存在');
        // 创建企业（初始状态无套餐，待支付后激活）
        const enterpriseId = await EnterpriseRepository_js_1.EnterpriseRepository.create({
            name,
            description,
            admin_id: adminUserId,
            tier_id: null, // 支付成功后设置
            daily_task_limit: 0,
            task_limit_reset_date: new Date().toISOString().slice(0, 10),
        });
        // 更新用户角色为企业管理员
        await UserRepository_js_1.UserRepository.update(adminUserId, { role: 'enterprise_admin' });
        // 将创建者添加为企业员工（管理员）
        await EmployeeRepository_js_1.EmployeeRepository.create({
            enterprise_id: enterpriseId,
            user_id: adminUserId,
            is_admin: true,
            registration_method: 'direct_register',
        });
        return await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
    }
    /**
     * 校验企业是否可执行管理操作（非冻结、有有效套餐）
     */
    static async validateEnterpriseCanOperate(enterpriseId, operation = '操作') {
        const [ents] = await require('../config/database').default.query('SELECT status, subscription_expires_at, tier_id FROM enterprises WHERE id = ?', [enterpriseId]);
        if (!ents)
            throw new Error('企业不存在');
        if (ents.status === 'frozen') {
            throw new Error(`企业套餐已冻结，无法${operation}。请续费或升级套餐后再试`);
        }
        if (ents.status !== 'active') {
            throw new Error(`企业当前状态不允许${operation}`);
        }
    }
    /**
     * 获取企业详情（含员工数等信息）
     */
    static async getEnterpriseDetail(enterpriseId, requesterRole, requesterId) {
        const enterprise = await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
        if (!enterprise)
            throw new Error('企业不存在');
        if (enterprise.status === 'closed')
            throw new Error('企业已关闭');
        // 权限检查：只有本企业管理员和超管可以查看详情
        if (requesterRole !== 'super_admin' && enterprise.admin_id !== requesterId) {
            throw new Error('无权查看该企业详情');
        }
        const employeeCount = await EmployeeRepository_js_1.EmployeeRepository.countByEnterprise(enterpriseId);
        return {
            ...enterprise,
            employee_count: employeeCount,
        };
    }
    /**
     * 绑定/拉取系统内已有的工作者为员工
     */
    static async bindEmployee(enterpriseId, adminUserId, targetUserEmailOrPhone) {
        // 验证管理员身份
        const enterprise = await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
        if (!enterprise || enterprise.admin_id !== adminUserId) {
            throw new Error('无权操作此企业');
        }
        // 校验企业套餐状态（冻结状态下不可新增员工）
        await this.validateEnterpriseCanOperate(enterpriseId, '绑定新员工');
        // 查找目标用户
        let targetUser = await UserRepository_js_1.UserRepository.findByEmail(targetUserEmailOrPhone);
        if (!targetUser)
            targetUser = await UserRepository_js_1.UserRepository.findByPhone(targetUserEmailOrPhone);
        if (!targetUser)
            throw new Error('未找到该用户，请确认邮箱或手机号正确');
        // 检查目标用户是否已是某企业员工
        const existingEmp = await EmployeeRepository_js_1.EmployeeRepository.findByUserId(targetUser.id);
        if (existingEmp) {
            throw new Error(`该用户已是「${existingEmp.enterprise_name}」的员工，无法重复绑定`);
        }
        // 检查名额是否充足
        const currentCount = await EmployeeRepository_js_1.EmployeeRepository.countByEnterprise(enterpriseId);
        if (currentCount >= enterprise.total_employee_slots) {
            throw new Error('员工名额已满，请使用积分兑换更多名额');
        }
        // 绑定
        await EmployeeRepository_js_1.EmployeeRepository.create({
            enterprise_id: enterpriseId,
            user_id: targetUser.id,
            is_admin: false,
            registration_method: 'bound',
        });
        return { message: `成功绑定用户 ${targetUser.username} 为员工` };
    }
    /**
     * 踢出员工
     */
    static async removeEmployee(enterpriseId, adminUserId, targetUserId) {
        const enterprise = await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
        if (!enterprise || enterprise.admin_id !== adminUserId) {
            throw new Error('无权操作此企业');
        }
        if (adminUserId === targetUserId) {
            throw new Error('不能踢出自己，如需关闭企业请联系客服');
        }
        const removed = await EmployeeRepository_js_1.EmployeeRepository.remove(enterpriseId, targetUserId);
        if (!removed)
            throw new Error('该用户不是您的企业员工');
        // 释放一个免费名额（如果有的话）
        await EnterpriseRepository_js_1.EnterpriseRepository.addEmployeeSlots(enterpriseId, 1); // 这里可以改为仅恢复免费名额
    }
    /**
     * 提升员工为管理员
     */
    static async promoteToAdmin(enterpriseId, adminUserId, targetUserId) {
        const enterprise = await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
        if (!enterprise || enterprise.admin_id !== adminUserId) {
            throw new Error('无权操作此企业');
        }
        const updated = await EmployeeRepository_js_1.EmployeeRepository.setAdmin(enterpriseId, targetUserId, true);
        if (!updated)
            throw new Error('该用户不是您的企业员工');
    }
    /**
     * 直接注册新员工账号
     */
    static async directRegisterEmployee(enterpriseId, adminUserId, data) {
        const enterprise = await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
        if (!enterprise || enterprise.admin_id !== adminUserId) {
            throw new Error('无权操作此企业');
        }
        // 校验企业套餐状态
        await this.validateEnterpriseCanOperate(enterpriseId, '直接注册新员工');
        // 检查名额
        if (enterprise.free_employee_slots <= 0) {
            throw new Error('免费直接注册名额已用完，请使用积分兑换更多名额（10积分=1个名额）');
        }
        // 检查邮箱是否已被注册
        const existingEmail = await UserRepository_js_1.UserRepository.findByEmail(data.email);
        if (existingEmail)
            throw new Error('该邮箱已被注册');
        // 加密密码并创建用户
        const hashedPassword = await bcryptjs_1.default.hash(data.password, index_js_1.default.auth.bcryptSaltRounds);
        const userId = await UserRepository_js_1.UserRepository.create({
            email: data.email,
            password: hashedPassword,
            username: data.username,
            role: 'worker',
        });
        // 消耗一个免费名额
        await EnterpriseRepository_js_1.EnterpriseRepository.consumeFreeSlot(enterpriseId);
        // 绑定为员工
        await EmployeeRepository_js_1.EmployeeRepository.create({
            enterprise_id: enterpriseId,
            user_id: userId,
            is_admin: false,
            registration_method: 'direct_register',
        });
        return await UserRepository_js_1.UserRepository.findById(userId);
    }
    /**
     * 兑换员工注册名额
     */
    static async exchangeEmployeeSlots(enterpriseId, adminUserId, count) {
        const enterprise = await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
        if (!enterprise || enterprise.admin_id !== adminUserId) {
            throw new Error('无权操作此企业');
        }
        const pointsCost = count * 10;
        const adminUser = await UserRepository_js_1.UserRepository.findById(adminUserId);
        if (!adminUser || adminUser.points < pointsCost) {
            throw new Error(`积分不足：需要 ${pointsCost} 积分（${count} 个名额 × 10），当前 ${adminUser?.points || 0} 积分`);
        }
        // 扣减积分
        const balanceAfter = await UserRepository_js_1.UserRepository.deductPoints(adminUserId, pointsCost);
        // 记录积分变动
        await PointRecordRepository_js_1.PointRecordRepository.create({
            user_id: adminUserId,
            amount: -pointsCost,
            type: 'employee_slot_exchange',
            description: `兑换 ${count} 个员工注册名额`,
            balance_after: balanceAfter,
        });
        // 增加名额
        await EnterpriseRepository_js_1.EnterpriseRepository.addEmployeeSlots(enterpriseId, count);
    }
    /**
     * 获取企业员工列表
     */
    static async getEmployees(enterpriseId, adminUserId) {
        const enterprise = await EnterpriseRepository_js_1.EnterpriseRepository.findById(enterpriseId);
        if (!enterprise || enterprise.admin_id !== adminUserId) {
            throw new Error('无权查看该企业员工列表');
        }
        return await EmployeeRepository_js_1.EmployeeRepository.findByEnterpriseId(enterpriseId);
    }
}
exports.EnterpriseService = EnterpriseService;
