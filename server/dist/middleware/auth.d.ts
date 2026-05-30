import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../types/index.js';
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload & {
        enterpriseId?: number;
    };
}
/**
 * JWT 认证中间件 - 验证 Access Token
 */
export declare function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void;
/**
 * 角色授权中间件 - 检查用户角色是否匹配
 */
export declare function authorize(...allowedRoles: string[]): (req: AuthenticatedRequest, _res: Response, next: NextFunction) => void;
/**
 * 可选认证 - 不强制要求登录，但如果提供了token则解析
 */
export declare function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map