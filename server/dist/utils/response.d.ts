import { Response } from 'express';
import { ApiResponse } from '../types/index.js';
/**
 * 发送成功响应
 */
export declare function success<T>(res: Response, data: T, message?: string, statusCode?: number): Response;
/**
 * 发送分页响应
 */
export declare function paginated<T>(res: Response, list: T[], total: number, page: number, pageSize: number, message?: string): Response<ApiResponse<{
    list: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
/**
 * 创建响应辅助对象（不直接发送，供其他地方使用）
 */
export declare function createResponse<T>(data: T, message?: string, code?: number): ApiResponse<T>;
//# sourceMappingURL=response.d.ts.map