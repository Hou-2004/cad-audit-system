interface RegisterInput {
    email: string;
    phone?: string;
    password: string;
    username: string;
}
interface LoginInput {
    account: string;
    password: string;
}
export declare class AuthService {
    /**
     * 用户注册
     */
    static register(input: RegisterInput): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * 用户登录（支持邮箱或手机号）
     */
    static login(input: LoginInput): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * 刷新 Access Token
     */
    static refreshAccessToken(refreshTokenString: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * 登出 - 撤销 Refresh Token
     */
    static logout(refreshTokenString: string): Promise<void>;
    /**
     * 生成 Token 对
     */
    private static generateTokens;
}
export {};
//# sourceMappingURL=AuthService.d.ts.map