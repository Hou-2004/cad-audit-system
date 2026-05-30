import { Request, Response } from 'express';
import { z } from 'zod';
export declare class AuthController {
    static register(req: Request, res: Response): void;
    static login(req: Request, res: Response): void;
    static refresh(req: Request, res: Response): Promise<void>;
    static logout(req: Request, res: Response): Promise<void>;
}
export declare const authSchemas: {
    registerSchema: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        username: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
        username: string;
        phone?: string | undefined;
    }, {
        email: string;
        password: string;
        username: string;
        phone?: string | undefined;
    }>;
    loginSchema: z.ZodObject<{
        account: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        account: string;
    }, {
        password: string;
        account: string;
    }>;
};
//# sourceMappingURL=AuthController.d.ts.map