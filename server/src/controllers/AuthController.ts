// ============================================================
// 认证控制器
// ============================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService.js';
import { success } from '../utils/response.js';

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6位').max(50),
  username: z.string().min(2).max(30),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional(),
});

const loginSchema = z.object({
  account: z.string().min(1).max(100), // 邮箱或手机号
  password: z.string().min(1),
});

export class AuthController {
  static register(req: Request, res: Response): void {
    const input = req.body as z.infer<typeof registerSchema>;
    AuthService.register(input)
      .then((result) => {
        const { password: _p, ...user } = result.user;
        success(res, { user, accessToken: result.accessToken, refreshToken: result.refreshToken }, '注册成功', 201);
      })
      .catch((err) => {
        res.status(400).json({ code: 400, message: err.message, data: null });
      });
  }

  static login(req: Request, res: Response): void {
    const input = req.body as z.infer<typeof loginSchema>;
    AuthService.login(input)
      .then((result) => {
        const { password: _p, ...user } = result.user;
        success(res, { user, accessToken: result.accessToken, refreshToken: result.refreshToken }, '登录成功');
      })
      .catch((err) => {
        res.status(401).json({ code: 401, message: err.message, data: null });
      });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) {
      res.status(400).json({ code: 400, message: '缺少刷新令牌', data: null });
      return;
    }
    try {
      const tokens = await AuthService.refreshAccessToken(refreshToken);
      success(res, tokens);
    } catch (err: any) {
      res.status(401).json({ code: 401, message: err.message, data: null });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as { refreshToken: string };
    if (refreshToken) await AuthService.logout(refreshToken);
    success(res, null, '已退出登录');
  }
}

export const authSchemas = { registerSchema, loginSchema };
