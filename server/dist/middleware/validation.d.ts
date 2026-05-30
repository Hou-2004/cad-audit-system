import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * 验证请求体
 */
export declare function validateBody<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * 验证查询参数
 */
export declare function validateQuery<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map