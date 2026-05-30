import { Request, Response } from 'express';
export declare class EnterpriseController {
    static create(req: Request, res: Response): Promise<void>;
    static getDetail(req: Request, res: Response): Promise<void>;
    static getMyEnterprise(req: Request, res: Response): Promise<void>;
    static bindEmployee(req: Request, res: Response): Promise<void>;
    static removeEmployee(req: Request, res: Response): Promise<void>;
    static promoteAdmin(req: Request, res: Response): Promise<void>;
    static directRegister(req: Request, res: Response): Promise<void>;
    static exchangeSlots(req: Request, res: Response): Promise<void>;
    static getEmployees(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=EnterpriseController.d.ts.map