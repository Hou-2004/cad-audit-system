import { Request, Response } from 'express';
export declare class AuditController {
    static uploadAndAudit(req: Request, res: Response): Promise<void>;
    static auditTaskFile(req: Request, res: Response): Promise<void>;
    static getDetail(req: Request, res: Response): Promise<void>;
    static getHistory(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AuditController.d.ts.map