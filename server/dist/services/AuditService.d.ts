interface AuditCheckItem {
    category: string;
    ruleName: string;
    status: 'pass' | 'fail' | 'warning' | 'skip';
    detail: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
}
interface AuditResult {
    summary: {
        total: number;
        passed: number;
        failed: number;
        warning: number;
        skipped: number;
    };
    items: AuditCheckItem[];
    score: number;
    overallStatus: 'passed' | 'failed' | 'warning' | 'error';
}
export declare class AuditService {
    /**
     * 执行审核（工作者自行上传）
     */
    static auditFileForWorker(userId: number, filePath: string, originalName: string, specRequirements: Record<string, unknown>, ruleIds?: number[]): Promise<{
        recordId: number;
        result: AuditResult;
    }>;
    /**
     * 执行审核（企业直属员工 - 无限次不消耗积分）
     */
    static auditFileForEmployee(userId: number, enterpriseId: number, filePath: string, originalName: string, specRequirements: Record<string, unknown>, taskId?: number | null, ruleIds?: number[]): Promise<{
        recordId: number;
        result: AuditResult;
    }>;
    /**
     * 核心审核逻辑 - 解析CAD文件并匹配规则
     */
    static performAudit(filePath: string, specRequirements: Record<string, unknown>, ruleIds?: number[]): Promise<AuditResult>;
    /**
     * 解析 CAD 文件
     */
    private static parseCadFile;
    /**
     * DXF 文件解析器 (DXF 是文本格式，可直接读取)
     */
    private static parseDxfFile;
    /**
     * DWG 文件处理 (二进制格式，这里做模拟解析)
     * 生产环境可集成 ODA SDK 或 ode.js 库
     */
    private static parseDwgFile;
    /**
     * 默认图层集（用于无法解析时）
     */
    private static getDefaultLayers;
    /**
     * 从 DXF 内容中提取图框/标题栏信息
     */
    private static extractTitleBlock;
    private static runChecks;
    /**
     * 根据单条规则执行检查
     */
    private static checkAgainstRule;
    private static checkLayers;
    private static checkLinetypes;
    private static checkColors;
    private static checkDimensions;
    private static checkTextStyles;
    private static checkTitleBlock;
    /**
     * 基础检查（无规则时）
     */
    private static basicChecks;
    private static aggregateResults;
    private static getFormat;
    private static formatFileSize;
    /**
     * 获取审核历史
     */
    static getAuditHistory(filters: {
        user_id?: number;
        enterprise_id?: number;
        status?: string;
        keyword?: string;
        start_date?: string;
        end_date?: string;
        page: number;
        pageSize: number;
    }): Promise<any>;
    /**
     * 获取审核详情
     */
    static getAuditDetail(recordId: number): Promise<any>;
}
export {};
//# sourceMappingURL=AuditService.d.ts.map