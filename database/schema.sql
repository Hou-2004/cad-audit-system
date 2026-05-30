-- ============================================================
-- CAD 文件规范审核系统 - 数据库 Schema
-- 数据库: MySQL 8.0+
-- 字符集: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS cad_audit_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cad_audit_system;

-- -----------------------------------------------------------
-- 1. 用户表 (users)
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `subscription_orders`;
DROP TABLE IF EXISTS `subscription_tiers`;
DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `point_records`;
DROP TABLE IF EXISTS `recharge_records`;
DROP TABLE IF EXISTS `audit_records`;
DROP TABLE IF EXISTS `task_assignments`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `enterprises`;
DROP TABLE IF EXISTS `advertisements`;
DROP TABLE IF EXISTS `audit_rules`;
DROP TABLE IF EXISTS `file_chunks`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `password` VARCHAR(255) NOT NULL COMMENT '加密密码',
    `username` VARCHAR(100) NOT NULL COMMENT '用户名',
    `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    `role` ENUM('worker', 'enterprise_admin', 'super_admin') NOT NULL DEFAULT 'worker' COMMENT '角色: worker=普通工作者, enterprise_admin=企业管理员, super_admin=超级管理员',
    `points` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '积分余额',
    `free_audit_count_daily` TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '每日免费审核次数',
    `free_audit_count_used` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当日已用免费审核次数',
    `free_audit_reset_date` DATE NOT NULL COMMENT '免费次数重置日期',
    `status` ENUM('active', 'disabled', 'banned') NOT NULL DEFAULT 'active' COMMENT '状态',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_email` (`email`),
    UNIQUE KEY `uk_phone` (`phone`),
    KEY `idx_role` (`role`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- -----------------------------------------------------------
-- 2. 企业表 (enterprises)
-- -----------------------------------------------------------
CREATE TABLE `enterprises` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL COMMENT '企业名称',
    `description` TEXT DEFAULT NULL COMMENT '企业描述',
    `logo` VARCHAR(500) DEFAULT NULL COMMENT '企业Logo URL',
    `admin_id` BIGINT UNSIGNED NOT NULL COMMENT '创建者/管理员用户ID',
    `free_employee_slots` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT '剩余免费员工注册名额',
    `total_employee_slots` SMALLINT UNSIGNED NOT NULL DEFAULT 3 COMMENT '总员工名额(含付费)',
    -- === 套餐相关字段 ===
    `tier_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '当前套餐ID(NULL=未开通或已过期)',
    `subscription_started_at` DATETIME DEFAULT NULL COMMENT '当前计费周期开始时间',
    `subscription_expires_at` DATETIME DEFAULT NULL COMMENT '当前套餐到期时间',
    `daily_task_limit` INT UNSIGNED DEFAULT 0 COMMENT '每日任务下发限额(0=无限制,由套餐决定)',
    `tasks_issued_today` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '今日已下发任务数(每日0点重置)',
    `task_limit_reset_date` DATE NOT NULL COMMENT '任务限额重置日期',
    `status` ENUM('active', 'suspended', 'closed', 'frozen') NOT NULL DEFAULT 'active' COMMENT '状态(frozen=套餐到期冻结)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_admin_id` (`admin_id`),
    KEY `idx_status` (`status`),
    KEY `idx_tier` (`tier_id`),
    CONSTRAINT `fk_enterprise_admin` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_enterprise_tier` FOREIGN KEY (`tier_id`) REFERENCES `subscription_tiers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业表';

-- -----------------------------------------------------------
-- 2.5. 企业套餐定义表 (subscription_tiers)
-- 三档企业付费套餐: 小型 / 中型 / 大型
-- -----------------------------------------------------------
CREATE TABLE `subscription_tiers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT '套餐名称(如: 小型企业/中型企业/大型企业)',
    `code` VARCHAR(50) NOT NULL COMMENT '套餐代码(small/medium/large)',
    `price_yearly` DECIMAL(10,2) NOT NULL COMMENT '年费价格(元)',
    `daily_task_limit` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '每日任务下发限额(0=无限制)',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '套餐描述/亮点说明',
    `features` JSON DEFAULT NULL COMMENT '套餐功能特性列表(JSON数组)',
    `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序(越小越靠前)',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否上架可购买',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业套餐定义表';

-- -----------------------------------------------------------
-- 2.6. 套餐订购/续费订单表 (subscription_orders)
-- 记录每次套餐购买、续费、升级的订单
-- -----------------------------------------------------------
CREATE TABLE `subscription_orders` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(64) NOT NULL COMMENT '订单号(唯一)',
    `enterprise_id` BIGINT UNSIGNED NOT NULL COMMENT '订购的企业ID',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '下单用户ID(企业管理员)',
    `tier_id` BIGINT UNSIGNED NOT NULL COMMENT '目标套餐ID',
    `order_type` ENUM('new', 'renew', 'upgrade') NOT NULL DEFAULT 'new' COMMENT '订单类型: new=首次购买 renew=续费 upgrade=升级',
    `original_price` DECIMAL(10,2) NOT NULL COMMENT '原价(元)',
    `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '优惠金额(升级补差价时可能为负数)',
    `final_price` DECIMAL(10,2) NOT NULL COMMENT '实付金额(元)',
    `points_used` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '使用积分抵扣数量(1积分=1元)',
    `cash_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '现金支付金额(元)',
    `payment_method` ENUM('points_only', 'cash_only', 'points_cash', 'mock') NOT NULL DEFAULT 'mock' COMMENT '支付方式',
    `trade_no` VARCHAR(128) DEFAULT NULL COMMENT '第三方交易号(现金支付时)',
    `status` ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
    `paid_at` DATETIME DEFAULT NULL COMMENT '支付完成时间',
    `period_start` DATETIME DEFAULT NULL COMMENT '本周期开始时间',
    `period_end` DATETIME DEFAULT NULL COMMENT '本周期结束时间(到期时间)',
    `prev_tier_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '升级前的套餐ID(升级订单)',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_enterprise` (`enterprise_id`),
    KEY `idx_user` (`user_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created` (`created_at`),
    CONSTRAINT `fk_so_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_so_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_so_tier` FOREIGN KEY (`tier_id`) REFERENCES `subscription_tiers`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐订购订单表';

-- -----------------------------------------------------------
-- 3. 员工关系表 (employees)
-- 记录企业与员工的关系，以及员工权限级别
-- -----------------------------------------------------------
CREATE TABLE `employees` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `enterprise_id` BIGINT UNSIGNED NOT NULL COMMENT '所属企业ID',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '员工用户ID',
    `is_admin` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否为企业子管理员',
    `registration_method` ENUM('bound', 'direct_register') NOT NULL DEFAULT 'bound' COMMENT '绑定方式: bound=拉取绑定, direct_register=管理员直接注册',
    `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_enterprise_user` (`enterprise_id`, `user_id`),
    KEY `idx_user_id` (`user_id`),
    CONSTRAINT `fk_emp_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_emp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工关系表';

-- -----------------------------------------------------------
-- 4. 审核规则库 (audit_rules)
-- 预设的审核规则模板，管理员可选用或自定义
-- -----------------------------------------------------------
CREATE TABLE `audit_rules` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL COMMENT '规则名称',
    `category` ENUM('layer', 'linetype', 'color', 'dimension', 'text_style', 'title_block', 'custom') NOT NULL DEFAULT 'custom' COMMENT '规则分类',
    `description` TEXT DEFAULT NULL COMMENT '规则描述',
    `rule_config` JSON NOT NULL COMMENT '规则配置JSON(具体匹配条件)',
    `is_preset` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否为预设规则',
    `creator_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建者ID(NULL为系统预设)',
    `status` ENUM('active', 'archived') NOT NULL DEFAULT 'active' COMMENT '状态',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_category` (`category`),
    KEY `idx_creator` (`creator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审核规则库';

-- -----------------------------------------------------------
-- 5. 任务表 (tasks)
-- 管理员下发给员工的审核任务
-- -----------------------------------------------------------
CREATE TABLE `tasks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `enterprise_id` BIGINT UNSIGNED NOT NULL COMMENT '所属企业ID',
    `creator_id` BIGINT UNSIGNED NOT NULL COMMENT '创建者(管理员)ID',
    `title` VARCHAR(300) NOT NULL COMMENT '任务标题',
    `description` TEXT DEFAULT NULL COMMENT '任务描述',
    `spec_requirements` JSON NOT NULL COMMENT 'CAD文件规范要求(JSON配置)',
    `selected_rule_ids` JSON DEFAULT NULL COMMENT '选用的规则ID列表',
    `target_user_ids` JSON DEFAULT NULL COMMENT '目标员工用户ID列表(NULL表示全员)',
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级',
    `deadline` DATETIME DEFAULT NULL COMMENT '截止时间',
    `status` ENUM('draft', 'active', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'draft' COMMENT '状态',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_enterprise` (`enterprise_id`),
    KEY `idx_creator` (`creator_id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_task_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_task_creator` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表';

-- -----------------------------------------------------------
-- 6. 任务分配记录 (task_assignments)
-- 记录任务与员工的分配关系及完成情况
-- -----------------------------------------------------------
CREATE TABLE `task_assignments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `task_id` BIGINT UNSIGNED NOT NULL COMMENT '任务ID',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '被分配员工用户ID',
    `status` ENUM('pending', 'in_progress', 'completed', 'skipped') NOT NULL DEFAULT 'pending' COMMENT '完成状态',
    `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
    `notes` TEXT DEFAULT NULL COMMENT '备注',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_task_user` (`task_id`, `user_id`),
    KEY `idx_user_id` (`user_id`),
    CONSTRAINT `fk_ta_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ta_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务分配记录';

-- -----------------------------------------------------------
-- 7. 审核记录表 (audit_records)
-- 每次CAD文件审核的完整记录
-- -----------------------------------------------------------
CREATE TABLE `audit_records` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '提交审核的用户ID',
    `enterprise_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联企业ID(企业员工审核时)',
    `task_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联任务ID(企业任务审核时)',
    `file_name` VARCHAR(300) NOT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(500) NOT NULL COMMENT '存储路径',
    `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小(bytes)',
    `file_format` ENUM('dwg', 'dxf', 'dwf', 'other') NOT NULL DEFAULT 'other' COMMENT '文件格式',
    `spec_requirements` JSON NOT NULL COMMENT '本次审核使用的规范要求',
    `rule_ids` JSON DEFAULT NULL COMMENT '使用的规则ID列表',
    `audit_result` JSON NOT NULL COMMENT '审核结果详情(JSON,包含通过/不通过项)',
    `overall_status` ENUM('passed', 'failed', 'warning', 'error') NOT NULL DEFAULT 'error' COMMENT '整体结果',
    `score` TINYINT unsigned default null comment '合规分数(0-100)',
    `points_cost` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '消耗积分为0(免费)/1(积分兑换)',
    `report_path` VARCHAR(500) DEFAULT NULL COMMENT '报告文件路径',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_enterprise` (`enterprise_id`),
    KEY `idx_task` (`task_id`),
    KEY `idx_status` (`overall_status`),
    KEY `idx_created` (`created_at`),
    KEY `idx_file_name` (`file_name`),
    CONSTRAINT `fk_ar_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ar_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_ar_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审核记录表';

-- -----------------------------------------------------------
-- 8. 文件分片临时表 (file_chunks)
-- 大文件分片上传时使用
-- -----------------------------------------------------------
CREATE TABLE `file_chunks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `upload_id` VARCHAR(64) NOT NULL COMMENT '上传会话UUID',
    `chunk_index` INT UNSIGNED NOT NULL COMMENT '分片序号(从0开始)',
    `chunk_path` VARCHAR(500) NOT NULL COMMENT '分片文件存储路径',
    `chunk_size` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '分片大小',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_upload_chunk` (`upload_id`, `chunk_index`),
    KEY `idx_upload_id` (`upload_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件分片表';

-- -----------------------------------------------------------
-- 9. 积分变动记录 (point_records)
-- -----------------------------------------------------------
CREATE TABLE `point_records` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    `amount` INT NOT NULL COMMENT '变动数量(正=增加,负=减少)',
    `type` ENUM('recharge', 'audit_exchange', 'employee_slot_exchange', 'refund', 'admin_adjust', 'system_reward') NOT NULL COMMENT '类型',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '说明',
    `related_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联业务ID',
    `balance_after` INT UNSIGNED NOT NULL COMMENT '变动后余额',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_type` (`type`),
    KEY `idx_created` (`created_at`),
    CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分变动记录表';

-- -----------------------------------------------------------
-- 10. 充值记录表 (recharge_records)
-- -----------------------------------------------------------
CREATE TABLE `recharge_records` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    `amount` DECIMAL(10,2) NOT NULL COMMENT '充值金额(元)',
    `points_granted` INT UNSIGNED NOT NULL COMMENT '获得积分',
    `payment_method` ENUM('alipay', 'wechat', 'mock') NOT NULL DEFAULT 'mock' COMMENT '支付方式',
    `trade_no` VARCHAR(128) DEFAULT NULL COMMENT '第三方交易号',
    `status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending' COMMENT '状态',
    `paid_at` DATETIME DEFAULT NULL COMMENT '支付时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    KEY `idx_trade_no` (`trade_no`),
    CONSTRAINT `fk_rr_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值记录表';

-- -----------------------------------------------------------
-- 11. 广告表 (advertisements)
-- -----------------------------------------------------------
CREATE TABLE `advertisements` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL COMMENT '广告标题',
    `image_url` VARCHAR(500) NOT NULL COMMENT '广告图片URL',
    `link_url` VARCHAR(500) DEFAULT NULL COMMENT '点击跳转链接',
    `position` ENUM('homepage_banner', 'sidebar', 'dashboard_top', 'interstitial') NOT NULL DEFAULT 'homepage_banner' COMMENT '广告位置',
    `start_time` DATETIME NOT NULL COMMENT '开始时间',
    `end_time` DATETIME NOT NULL COMMENT '结束时间',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序(越小越靠前)',
    `status` ENUM('active', 'paused', 'expired') NOT NULL DEFAULT 'active' COMMENT '状态',
    `click_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点击次数',
    `impression_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '展示次数',
    `creator_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建者(超管)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_position` (`position`),
    KEY `idx_status` (`status`),
    KEY `idx_time_range` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='广告表';

-- -----------------------------------------------------------
-- 12. JWT Refresh Token 表 (refresh_tokens)
-- -----------------------------------------------------------
CREATE TABLE `refresh_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    `token_hash` VARCHAR(512) NOT NULL COMMENT 'Token哈希值',
    `expires_at` DATETIME NOT NULL COMMENT '过期时间',
    `revoked` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已撤销',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ip_address` VARCHAR(45) DEFAULT NULL COMMENT '创建时的IP',
    `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '创建时的UA',
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`),
    KEY `idx_token_hash` (`token_hash`),
    KEY `idx_expires` (`expires_at`),
    CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Refresh Token 表';


-- ============================================================
-- 初始数据
-- ============================================================

-- 创建超级管理员账号 (密码: Admin@123456, bcrypt hash)
INSERT INTO `users` (`email`, `phone`, `password`, `username`, `role`, `points`, `free_audit_count_daily`, `free_audit_count_used`, `free_audit_reset_date`, `status`) VALUES
('admin@cadaudit.com', NULL, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.HHRR7O0JNFNfGO', '超级管理员', 'super_admin', 99999, 99, 0, CURDATE(), 'active');

-- 插入预设审核规则
INSERT INTO `audit_rules` (`name`, `category`, `description`, `rule_config`, `is_preset`, `creator_id`, `status`) VALUES
('标准图层命名规范', 'layer', '检查图层名称是否符合国标命名规范',
 '{"pattern": "^[A-Za-z0-9_-]+$", "maxLength": 32, "requiredLayers": ["0", "Defpoints", "中心线", "标注", "尺寸", "剖面线", "填充", "文本", "粗实线", "细实线", "虚线"]}',
 true, NULL, 'active'),

('线型规范检查', 'linetype', '检查CAD文件中使用的线型是否符合工程制图标准',
 '{"allowedLinetypes": ["Continuous", "DASHED", "DOT", "DASHDOT", "CENTER", "PHANTOM"], "forbidScaleMismatch": true}',
 true, NULL, 'active'),

('颜色规范(按图层)', 'color', '检查各图层的颜色设置是否符合规范',
 '{"layerColorRules": {"0": [7], "粗实线": [7], "细实线": [7], "中心线": [1], "虚线": [2], "尺寸": [3], "文本": [7], "剖面线": [9]}}',
 true, NULL, 'active'),

('尺寸标注规范', 'dimension', '检查尺寸标注样式和规范性',
 '{"requireArrowStyle": true, "minDimensionPrecision": 1, "maxTextHeight": 5, "checkExtensionLines": true, "checkOverlap": true}',
 true, NULL, 'active'),

('文字样式规范', 'text_style', '检查文字样式、字体、高度等',
 '{"maxTextHeight": 10, "minTextHeight": 2.5, "allowedFonts": ["simplex", "txt", "gbcbig"], "forbidExplodedText": true}',
 true, NULL, 'active'),

('图框规范检查', 'title_block', '检查图纸图框、标题栏、比例等',
 '{"requireTitleBlock": true, "standardSizes": ["A0", "A1", "A2", "A3", "A4"], "checkScale": true, "checkTitleInfo": ["图名", "设计", "审核", "日期", "比例"]}',
 true, NULL, 'active');

-- ============================================================
-- 初始数据: 企业套餐 (三档)
-- ============================================================
INSERT INTO `subscription_tiers` (`code`, `name`, `price_yearly`, `daily_task_limit`, `description`, `features`, `sort_order`, `is_active`) VALUES
('small', '小型企业', 288.00, 20,
 '适合小型团队或初创企业，满足基础 CAD 审核管理需求',
 '["每日最多下发20个任务", "支持绑定/注册员工", "完整审核功能", "3个免费直注员工名额"]', 1, TRUE),

('medium', '中型企业', 588.00, 50,
 '适合成长型企业，提供更充裕的任务处理能力',
 '["每日最多下发50个任务", "支持绑定/注册员工", "完整审核功能+高级报表", "3个免费直注员工名额", "优先技术支持"]', 2, TRUE),

('large', '大型企业', 1088.00, 0,
 '适合大型团队或集团公司，任务下发无限制',
 '["任务下发无限制", "支持绑定/注册员工", "完整审核功能+高级报表+API接口", "3个免费直注员工名额", "专属客户经理", "定制化规则模板"]', 3, TRUE);

-- ============================================================
-- 索引优化
-- ============================================================

-- 审核记录复合索引（用于筛选查询）
CREATE INDEX idx_audit_filter ON `audit_records` (`user_id`, `overall_status`, `created_at`);

-- 积分记录复合索引
CREATE INDEX idx_point_user_type ON `point_records` (`user_id`, `type`, `created_at`);

-- 套餐订单复合索引
CREATE INDEX idx_so_enterprise_status ON `subscription_orders` (`enterprise_id`, `status`);
