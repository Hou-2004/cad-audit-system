// 类型定义
export interface User {
  id: number;
  email: string;
  phone: string | null;
  username: string;
  avatar: string | null;
  role: 'worker' | 'enterprise_admin' | 'super_admin';
  points: number;
  free_audit_count_daily: number;
  free_audit_count_used: number;
  free_audit_remaining: number;
  enterprise_id?: number;
  enterprise_name?: string;
  is_enterprise_admin?: boolean;
}

export interface LoginRequest {
  account: string; // email or phone
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResponse<T = any> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditResultItem {
  category: string;
  ruleName: string;
  status: 'pass' | 'fail' | 'warning' | 'skip' | 'error';
  detail: string;
  actual?: string;
  suggestion?: string;
}

export interface AuditResult {
  summary: { total: number; passed: number; failed: number; warning: number; skipped: number };
  items: AuditResultItem[];
  score: number;
  overallStatus: 'passed' | 'failed' | 'warning' | 'error';
}

export interface AuditRecord {
  id: number;
  user_id: number;
  file_name: string;
  file_size: number;
  file_format: string;
  audit_result: AuditResult;
  overall_status: string;
  score: number | null;
  points_cost: number;
  created_at: string;
  uploader_username?: string;
}

export interface Task {
  id: number;
  enterprise_id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  deadline: string | null;
  created_at: string;
  assignment_status?: string;
}

export interface Enterprise {
  id: number;
  name: string;
  description: string | null;
  admin_id: number;
  free_employee_slots: number;
  total_employee_slots: number;
  employee_count?: number;
}

export interface Employee {
  id: number;
  user_id: number;
  username: string;
  email: string;
  is_admin: boolean;
  registration_method: string;
  joined_at: string;
}

export interface AdInfo {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  position: string;
  sort_order: number;
  click_count: number;
}

export interface PointsInfo {
  balance: number;
  freeAuditDaily: number;
  freeAuditUsed: number;
  freeAuditRemaining: number;
}
