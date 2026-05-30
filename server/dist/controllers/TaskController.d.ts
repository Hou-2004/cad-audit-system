import { Request, Response } from 'express';
export declare class TaskController {
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static listEnterpriseTasks(req: Request, res: Response): Promise<void>;
    static listMyTasks(req: Request, res: Response): Promise<void>;
    static updateStatus(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=TaskController.d.ts.map