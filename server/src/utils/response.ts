// ============================================================
// 统一响应格式
// ============================================================

import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';

/**
 * 发送成功响应
 */
export function success<T>(res: Response, data: T, message = '操作成功', statusCode = 200): Response {
  const body: ApiResponse<T> = {
    code: statusCode,
    message,
    data,
    timestamp: Date.now(),
  };
  return res.status(statusCode).json(body);
}

/**
 * 发送分页响应
 */
export function paginated<T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
  message = '查询成功',
): Response<ApiResponse<{ list: T[]; total: number; page: number; pageSize: number; totalPages: number }>> {
  return success(res, {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }, message);
}

/**
 * 创建响应辅助对象（不直接发送，供其他地方使用）
 */
export function createResponse<T>(data: T, message = '操作成功', code = 200): ApiResponse<T> {
  return { code, message, data, timestamp: Date.now() };
}
