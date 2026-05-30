// ============================================================
// 认证服务 - 注册、登录、JWT 管理
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { PointRecordRepository } from '../repositories/PointRecordRepository.js';
import { pool } from '../config/database.js';

interface RegisterInput {
  email: string;
  phone?: string;
  password: string;
  username: string;
}

interface LoginInput {
  account: string; // email or phone
  password: string;
}

export class AuthService {
  /**
   * 用户注册
   */
  static async register(input: RegisterInput): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    // 检查邮箱是否已存在
    const existingEmail = await UserRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new Error('该邮箱已被注册');
    }

    // 如果提供了手机号，检查是否已使用
    if (input.phone) {
      const existingPhone = await UserRepository.findByPhone(input.phone);
      if (existingPhone) {
        throw new Error('该手机号已被注册');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(input.password, config.auth.bcryptSaltRounds);

    // 创建用户
    const userId = await UserRepository.create({
      email: input.email,
      phone: input.phone,
      password: hashedPassword,
      username: input.username,
      role: 'worker',
    });

    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('用户创建失败');

    // 生成 Token
    const tokens = await this.generateTokens(user);

    return { user, ...tokens };
  }

  /**
   * 用户登录（支持邮箱或手机号）
   */
  static async login(input: LoginInput): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    // 判断是邮箱还是手机号登录
    let user: Awaited<ReturnType<typeof UserRepository.findByEmail>> | null = null;

    if (input.account.includes('@')) {
      user = await UserRepository.findByEmail(input.account);
    } else {
      user = await UserRepository.findByPhone(input.account);
    }

    if (!user) {
      throw new Error('账号或密码错误');
    }

    if (user.status !== 'active') {
      throw new Error('账号已停用，请联系客服');
    }

    // 验证密码
    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new Error('账号或密码错误');
    }

    // 更新每日重置日期（如果跨天）
    if (user.free_audit_reset_date < new Date().toISOString().split('T')[0]) {
      await UserRepository.update(user.id, { free_audit_count_used: 0, free_audit_reset_date: new Date().toISOString().split('T')[0] });
    }

    const tokens = await this.generateTokens(user);

    return { user, ...tokens };
  }

  /**
   * 刷新 Access Token
   */
  static async refreshAccessToken(refreshTokenString: string): Promise<{ accessToken: string; refreshToken: string }> {
    // 验证 Refresh Token
    let decoded: { userId: number; role: string; email: string };
    try {
      decoded = jwt.verify(refreshTokenString, config.auth.jwtRefreshSecret) as typeof decoded;
    } catch {
      throw new Error('无效的刷新令牌');
    }

    // 检查 token 是否在数据库中且未撤销
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = false AND expires_at > NOW()',
      [Buffer.from(refreshTokenString).toString('base64')],
    );

    if (!rows[0]) {
      throw new Error('刷新令牌已失效，请重新登录');
    }

    const user = await UserRepository.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      throw new Error('用户不存在或已停用');
    }

    // 撤销旧 refresh token
    await pool.execute('UPDATE refresh_tokens SET revoked = true WHERE id = ?', [rows[0].id]);

    // 生成新 Token 对
    const tokens = await this.generateTokens(user);
    return tokens;
  }

  /**
   * 登出 - 撤销 Refresh Token
   */
  static async logout(refreshTokenString: string): Promise<void> {
    const tokenHash = Buffer.from(refreshTokenString).toString('base64');
    await pool.execute(
      'UPDATE refresh_tokens SET revoked = true WHERE token_hash = ?',
      [tokenHash],
    );
  }

  /**
   * 生成 Token 对
   */
  private static async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { userId: user.id, role: user.role, email: user.email };

    const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });

    const refreshToken = jwt.sign(payload, config.auth.jwtRefreshSecret, {
      expiresIn: config.auth.jwtRefreshExpiresIn,
    });

    // 存储 Refresh Token 到数据库
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    await pool.execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, Buffer.from(refreshToken).toString('base64'), expiresAt.toISOString()],
    );

    return { accessToken, refreshToken };
  }
}
