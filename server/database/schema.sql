-- ============================================================
-- CAD 文件规范审核系统 - 数据库 Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS cad_audit_system
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cad_audit_system;

-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  email       VARCHAR(255) NOT NULL UNIQUE,
  phone       VARCHAR(20)  DEFAULT NULL,
  password    VARCHAR(255) NOT NULL,
  username    VARCHAR(100) NOT NULL,
  avatar      VARCHAR(500) DEFAULT NULL,
  role        ENUM('worker', 'enterprise_admin', 'super_admin') NOT NULL DEFAULT 'worker',
  points      INT NOT NULL DEFAULT 0,
  free_audit_count_daily   INT NOT NULL DEFAULT 3,
  free_audit_count_used    INT NOT NULL DEFAULT 0,
  free_audit_reset_date    DATE NOT NULL DEFAULT (CURDATE()),
  status      ENUM('active', 'disabled', 'banned') NOT NULL DEFAULT 'active',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 企业表
-- ============================================================
CREATE TABLE IF NOT EXISTS enterprises (
  id                      INT PRIMARY KEY AUTO_INCREMENT,
  name                    VARCHAR(200) NOT NULL,
  description             TEXT DEFAULT NULL,
  logo                    VARCHAR(500) DEFAULT NULL,
  admin_id                INT NOT NULL,
  free_employee_slots     INT NOT NULL DEFAULT 3,
  total_employee_slots    INT NOT NULL DEFAULT 3,
  -- 套餐字段
  tier_id                 INT DEFAULT NULL,
  subscription_started_at DATETIME DEFAULT NULL,
  subscription_expires_at DATETIME DEFAULT NULL,
  daily_task_limit        INT NOT NULL DEFAULT 0,
  tasks_issued_today      INT NOT NULL DEFAULT 0,
  task_limit_reset_date   DATE NOT NULL DEFAULT (CURDATE()),
  -- 状态（含 frozen）
  status                  ENUM('active', 'suspended', 'closed', 'frozen') NOT NULL DEFAULT 'active',
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_admin (admin_id),
  INDEX idx_status (status),
  INDEX idx_tier (tier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 员工关系表
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id       INT NOT NULL,
  user_id             INT NOT NULL,
  is_admin            BOOLEAN NOT NULL DEFAULT 0,
  registration_method ENUM('bound', 'direct_register') NOT NULL DEFAULT 'bound',
  joined_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_enterprise_user (enterprise_id, user_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 审核规则表
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_rules (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(200) NOT NULL,
  category        ENUM('layer','linetype','color','dimension','text_style','title_block','custom') NOT NULL,
  description     TEXT DEFAULT NULL,
  rule_config     JSON NOT NULL COMMENT '规则配置JSON',
  is_preset       BOOLEAN NOT NULL DEFAULT 1 COMMENT '是否为预设规则',
  creator_id      INT DEFAULT NULL,
  status          ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_preset (is_preset),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 任务表
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id       INT NOT NULL,
  creator_id          INT NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT DEFAULT NULL,
  spec_requirements   JSON NOT NULL COMMENT '{}',
  selected_rule_ids   JSON DEFAULT NULL COMMENT '[1,2,3]',
  target_user_ids     JSON DEFAULT NULL,
  priority            ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  deadline            DATE DEFAULT NULL,
  status              ENUM('draft','active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_enterprise (enterprise_id),
  INDEX idx_creator (creator_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 任务分配表
-- ============================================================
CREATE TABLE IF NOT EXISTS task_assignments (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  task_id       INT NOT NULL,
  user_id       INT NOT NULL,
  status        ENUM('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
  completed_at  DATETIME DEFAULT NULL,
  notes         TEXT DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_task_user (task_id, user_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 审核记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_records (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  user_id             INT NOT NULL,
  enterprise_id       INT DEFAULT NULL,
  task_id             INT DEFAULT NULL,
  file_name           VARCHAR(255) NOT NULL,
  file_path           VARCHAR(500) NOT NULL,
  file_size           BIGINT NOT NULL,
  file_format         ENUM('dwg','dxf','dwf','other') NOT NULL,
  spec_requirements   JSON NOT NULL,
  rule_ids            JSON DEFAULT NULL,
  audit_result        JSON NOT NULL COMMENT '审核结果详情',
  overall_status      ENUM('passed','failed','warning','error') NOT NULL,
  score               SMALLINT DEFAULT NULL COMMENT '0-100',
  points_cost         INT NOT NULL DEFAULT 5,
  report_path         VARCHAR(500) DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_enterprise (enterprise_id),
  INDEX idx_status (overall_status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 积分变动记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS point_records (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  user_id       INT NOT NULL,
  amount        INT NOT NULL COMMENT '正数=增加，负数=扣除',
  type          ENUM('recharge','audit_exchange','employee_slot_exchange','refund','admin_adjust','system_reward') NOT NULL,
  description   VARCHAR(500) DEFAULT NULL,
  related_id    INT DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 充值记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS recharge_records (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  user_id       INT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  points        INT NOT NULL COMMENT '获得积分数',
  method        ENUM('alipay','wechat','mock') NOT NULL DEFAULT 'mock',
  trade_no      VARCHAR(200) DEFAULT NULL,
  status        ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at       DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 广告表
-- ============================================================
CREATE TABLE IF NOT EXISTS advertisements (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  title         VARCHAR(200) NOT NULL,
  image_url     VARCHAR(500) NOT NULL,
  link_url      VARCHAR(500) DEFAULT NULL,
  position      ENUM('homepage_banner','sidebar','dashboard_top','interstitial') NOT NULL,
  status        ENUM('active','paused','expired') NOT NULL DEFAULT 'active',
  click_count   INT NOT NULL DEFAULT 0,
  impressions   INT NOT NULL DEFAULT 0,
  start_time    DATETIME DEFAULT NULL,
  end_time      DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_position (position),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 套餐等级表
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  name              VARCHAR(100) NOT NULL COMMENT '套餐名称',
  code              VARCHAR(50) NOT NULL UNIQUE COMMENT '标识码',
  price_yearly      DECIMAL(10,2) NOT NULL COMMENT '年费价格(元)',
  daily_task_limit  INT NOT NULL DEFAULT 0 COMMENT '每日任务限额，0=不限',
  description       TEXT DEFAULT NULL,
  features          JSON DEFAULT NULL,
  sort_order        INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT 1,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 套餐订单表
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_orders (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  order_no            VARCHAR(64) NOT NULL UNIQUE COMMENT '订单号',
  enterprise_id       INT NOT NULL,
  user_id             INT NOT NULL,
  tier_id             INT NOT NULL,
  order_type          ENUM('new','renew','upgrade') NOT NULL,
  original_price      DECIMAL(10,2) NOT NULL,
  discount_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_price         DECIMAL(10,2) NOT NULL,
  points_used         INT NOT NULL DEFAULT 0,
  cash_amount         DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method      ENUM('points_only','cash_only','points_cash','mock') NOT NULL DEFAULT 'mock',
  trade_no            VARCHAR(200) DEFAULT NULL,
  status              ENUM('pending','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  paid_at             DATETIME DEFAULT NULL,
  period_start        DATETIME DEFAULT NULL,
  period_end          DATETIME DEFAULT NULL,
  prev_tier_id        INT DEFAULT NULL COMMENT '升级前的套餐ID',
  remark              TEXT DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id) ON DELETE RESTRICT,
  INDEX idx_enterprise (enterprise_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_order_no (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 初始数据
-- ============================================================

-- 超级管理员默认账号
INSERT IGNORE INTO users (email, password, username, role, points, free_audit_count_daily)
VALUES ('admin@cad.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/./wRjGGLKXFpGXc6S', '超级管理员', 'super_admin', 99999, 99);

-- 预设审核规则
INSERT IGNORE INTO audit_rules (name, category, description, rule_config, is_preset) VALUES
('图层命名规范检查', 'layer', '检查CAD文件中图层的命名是否符合企业规范', '{"pattern": "^[a-zA-Z][a-zA-Z0-9_]{2,15}$", "maxLayers": 50}', 1),
('禁止冻结图层检查', 'layer', '扫描是否存在被冻结的关键图层', '{"forbiddenFrozen": ["0", "DEFPOINTS", "轮廓"]}', 1),
('线型规范检查', 'linetype', '检查使用的线型是否在允许列表内', '{"allowedLinetypes": ["Continuous", "DASHED", "CENTER", "PHANTOM"]}', 1),
('颜色规范检查 (ACI)', 'color', '检查颜色索引(ACI)是否在规定范围内', '{"allowedRange": [1, 7], "customColors": []}', 1),
('尺寸标注完整性', 'dimension', '检查关键尺寸标注是否存在且完整', '{"requireLinear": true, "requireRadial": false, "requireAngular": false}', 1),
('文字样式一致性', 'text_style', '检查文字高度、字体、对齐方式等', '{"minHeight": 2.5, "fonts": ["SIMHEI", "TXT.SHX"], "checkAlignment": true}', 1),
('标题栏完整性', 'title_block', '检查图框和标题栏信息是否齐全', '{"requireDrawingNumber": true, "requireTitle": true, "requireScale": true, "requireDate": true}', 1);

-- 套餐初始数据
INSERT IGNORE INTO subscription_tiers (id, name, code, price_yearly, daily_task_limit, description, features, sort_order, is_active) VALUES
(1, '基础版', 'small', 288.00, 20, '适合小型团队或个人工作室', '["每日20次审核任务", "3个免费员工名额", "基础审核规则库"]', 1, 1),
(2, '专业版', 'medium', 588.00, 50, '适合中型设计团队', '["每日50次审核任务", "3个免费员工名额", "全部审核规则库", "自定义规则支持", "优先技术支持"]', 2, 1),
(3, '企业版', 'large', 1088.00, 0, '适合大型企业，无任务限制', '["无限审核任务", "3个免费员工名额", "全部审核规则库+自定义", "专属技术支持", "API接口访问"]', 3, 1);
