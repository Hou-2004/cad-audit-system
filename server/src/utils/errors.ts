// ============================================================
// 自定义错误类 - 类型化错误体系
// ============================================================

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 未找到
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(
      id ? `${resource} 不存在 (ID: ${id})` : `${resource} 不存在`,
      'NOT_FOUND',
      404,
    );
  }
}

// 400 参数校验失败
export class ValidationError extends AppError {
  constructor(public readonly errors: Array<{ field: string; message: string }>) {
    super('请求参数验证失败', 'VALIDATION_ERROR', 422);
  }
}

// 401 未认证
export class UnauthorizedError extends AppError {
  constructor(message = '未登录或登录已过期') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

// 403 无权限
export class ForbiddenError extends AppError {
  constructor(message = '没有权限执行此操作') {
    super(message, 'FORBIDDEN', 403);
  }
}

// 409 冲突
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

// 业务逻辑错误
export class BusinessError extends AppError {
  constructor(message: string, code = 'BUSINESS_ERROR') {
    super(message, code, 400);
  }
}
