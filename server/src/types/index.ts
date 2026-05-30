// ============================================================
// 全局类型定义
// ============================================================

// 用户角色
export type UserRole = 'worker' | 'enterprise_admin' | 'super_admin';

// 用户状态
export type UserStatus = 'active' | 'disabled' | 'banned';

// 企业状态
export type EnterpriseStatus = 'active' | 'suspended' | 'closed' | 'frozen';

// 套餐订单类型
export type SubscriptionOrderType = 'new' | 'renew' | 'upgrade';

// 套餐订单状态
export type SubscriptionOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

// 套餐支付方式
export type SubPaymentMethod = 'points_only' | 'cash_only' | 'points_cash' | 'mock';

// 员工注册方式
export type RegistrationMethod = 'bound' | 'direct_register';

// 审核规则分类
export type RuleCategory = 'layer' | 'linetype' | 'color' | 'dimension' | 'text_style' | 'title_block' | 'custom';

// 任务优先级
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 任务状态
export type TaskStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

// 分配状态
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

// 文件格式
export type CadFileFormat = 'dwg' | 'dxf' | 'dwf' | 'other';

// 审核结果状态
export type AuditOverallStatus = 'passed' | 'failed' | 'warning' | 'error';

// 积分变动类型
export type PointType = 'recharge' | 'audit_exchange' | 'employee_slot_exchange' | 'refund' | 'admin_adjust' | 'system_reward';

// 支付方式
export type PaymentMethod = 'alipay' | 'wechat' | 'mock';

// 充值状态
export type RechargeStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// 广告位置
export type AdPosition = 'homepage_banner' | 'sidebar' | 'dashboard_top' | 'interstitial';

// 广告状态
export type AdStatus = 'active' | 'paused' | 'expired';

// 用户实体
export interface User {
  id: number;
  email: string;
  phone: string | null;
  password: string;
  username: string;
  avatar: string | null;
  role: UserRole;
  points: number;
  free_audit_count_daily: number;
  free_audit_count_used: number;
  free_audit_reset_date: string; // Date string YYYY-MM-DD
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

// 企业实体
export interface Enterprise {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  admin_id: number;
  free_employee_slots: number;
  total_employee_slots: number;
  // === 套餐字段 ===
  tier_id: number | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  daily_task_limit: number;       // 0=无限制
  tasks_issued_today: number;
  task_limit_reset_date: string;   // YYYY-MM-DD
  status: EnterpriseStatus;
  created_at: string;
  updated_at: string;
}

// 套餐定义实体
export interface SubscriptionTier {
  id: number;
  name: string;
  code: string;
  price_yearly: number;
  daily_task_limit: number;
  description: string | null;
  features: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 套餐订单实体
export interface SubscriptionOrder {
  id: number;
  order_no: string;
  enterprise_id: number;
  user_id: number;
  tier_id: number;
  order_type: SubscriptionOrderType;
  original_price: number;
  discount_amount: number;
  final_price: number;
  points_used: number;
  cash_amount: number;
  payment_method: SubPaymentMethod;
  trade_no: string | null;
  status: SubscriptionOrderStatus;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  prev_tier_id: number | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

// 员工关系实体（含关联数据）
export interface Employee {
  id: number;
  enterprise_id: number;
  user_id: number;
  is_admin: boolean;
  registration_method: RegistrationMethod;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // 关联字段
  user?: Omit<User, 'password'>;
  enterprise?: Enterprise;
}

// 审核规则实体
export interface AuditRule {
  id: number;
  name: string;
  category: RuleCategory;
  description: string | null;
  rule_config: Record<string, unknown>;
  is_preset: boolean;
  creator_id: number | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// 任务实体
export interface Task {
  id: number;
  enterprise_id: number;
  creator_id: number;
  title: string;
  description: string | null;
  spec_requirements: Record<string, unknown>;
  selected_rule_ids: number[] | null;
  target_user_ids: number[] | null;
  priority: TaskPriority;
  deadline: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

// 任务分配实体
export interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: number;
  status: AssignmentStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 审核记录实体
export interface AuditRecord {
  id: number;
  user_id: number;
  enterprise_id: number | null;
  task_id: number | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_format: CadFileFormat;
  spec_requirements: Record<string, unknown>;
  rule_ids: number[] | null;
  audit_result: Record<string, unknown>;
  overall_status: AuditOverallStatus;
  score: number | null;
  points_cost: number;
  report_path: string | null;
  created_at: string;
}

// JWT Payload
export interface JwtPayload {
  userId: number;
  role: UserRole;
  email: string;
}

// 请求中的用户信息（从JWT解析后附加到req）
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { enterpriseId?: number };
}

// API 统一响应格式
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页结果
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 文件分片上传请求
export interface ChunkUploadRequest {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileSize: number;
  fileHash?: string;
}

// 合并文件完成请求
export interface MergeCompleteRequest {
  uploadId: string;
  fileName: string;
  fileSize: number;
}
