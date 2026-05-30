// ============================================================
// JWT 认证中间件
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { JwtPayload } from '../types/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

// 扩展 Express Request 类型
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { enterpriseId?: number };
}

/**
 * JWT 认证中间件 - 验证 Access Token
 */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('缺少认证令牌');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('登录已过期，请重新登录');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('无效的认证令牌');
    }
    throw new UnauthorizedError('认证失败');
  }
}

/**
 * 角色授权中间件 - 检查用户角色是否匹配
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`需要 ${allowedRoles.join('/')} 权限`);
    }
    next();
  };
}

/**
 * 可选认证 - 不强制要求登录，但如果提供了token则解析
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email,
      };
    } catch {
      // 忽略无效token
    }
  }
  next();
}
