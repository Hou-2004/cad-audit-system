export type UserRole = 'worker' | 'enterprise_admin' | 'super_admin';
export type UserStatus = 'active' | 'disabled' | 'banned';
export type EnterpriseStatus = 'active' | 'suspended' | 'closed' | 'frozen';
export type SubscriptionOrderType = 'new' | 'renew' | 'upgrade';
export type SubscriptionOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type SubPaymentMethod = 'points_only' | 'cash_only' | 'points_cash' | 'mock';
export type RegistrationMethod = 'bound' | 'direct_register';
export type RuleCategory = 'layer' | 'linetype' | 'color' | 'dimension' | 'text_style' | 'title_block' | 'custom';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type CadFileFormat = 'dwg' | 'dxf' | 'dwf' | 'other';
export type AuditOverallStatus = 'passed' | 'failed' | 'warning' | 'error';
export type PointType = 'recharge' | 'audit_exchange' | 'employee_slot_exchange' | 'refund' | 'admin_adjust' | 'system_reward';
export type PaymentMethod = 'alipay' | 'wechat' | 'mock';
export type RechargeStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type AdPosition = 'homepage_banner' | 'sidebar' | 'dashboard_top' | 'interstitial';
export type AdStatus = 'active' | 'paused' | 'expired';
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
    free_audit_reset_date: string;
    status: UserStatus;
    created_at: string;
    updated_at: string;
}
export interface Enterprise {
    id: number;
    name: string;
    description: string | null;
    logo: string | null;
    admin_id: number;
    free_employee_slots: number;
    total_employee_slots: number;
    tier_id: number | null;
    subscription_started_at: string | null;
    subscription_expires_at: string | null;
    daily_task_limit: number;
    tasks_issued_today: number;
    task_limit_reset_date: string;
    status: EnterpriseStatus;
    created_at: string;
    updated_at: string;
}
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
export interface Employee {
    id: number;
    enterprise_id: number;
    user_id: number;
    is_admin: boolean;
    registration_method: RegistrationMethod;
    joined_at: string;
    created_at: string;
    updated_at: string;
    user?: Omit<User, 'password'>;
    enterprise?: Enterprise;
}
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
export interface JwtPayload {
    userId: number;
    role: UserRole;
    email: string;
}
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload & {
        enterpriseId?: number;
    };
}
export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
    timestamp: number;
}
export interface PaginationParams {
    page: number;
    pageSize: number;
}
export interface PaginatedResult<T> {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface ChunkUploadRequest {
    uploadId: string;
    chunkIndex: number;
    totalChunks: number;
    fileName: string;
    fileSize: number;
    fileHash?: string;
}
export interface MergeCompleteRequest {
    uploadId: string;
    fileName: string;
    fileSize: number;
}
//# sourceMappingURL=index.d.ts.map