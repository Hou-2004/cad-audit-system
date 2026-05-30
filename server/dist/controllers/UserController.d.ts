import { Request, Response } from 'express';
export declare class UserController {
    static me(req: Request, res: Response): Promise<void>;
    static updateMe(req: Request, res: Response): Promise<void>;
    static list(req: Request, res: Response): Promise<void>;
    static toggleStatus(req: Request, res: Response): Promise<void>;
    static adjustPoints(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map