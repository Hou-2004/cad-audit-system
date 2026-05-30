export interface ResultSetHeader {
    fieldCount: number;
    affectedRows: number;
    insertId: number;
    serverStatus: number;
    warningCount: number;
    message: string;
    protocol41: boolean;
    changedRows: number;
}
export interface RowDataPacket {
    [key: string]: unknown;
}
declare function getConnection(): Promise<{
    execute: (sql: string, params?: unknown[]) => Promise<[ResultSetHeader | RowDataPacket[], unknown[]]>;
    query: (sql: string, params?: unknown[]) => Promise<[ResultSetHeader | RowDataPacket[], unknown[]]>;
    release: () => void;
    beginTransaction: () => Promise<void>;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
}>;
declare const pool: {
    execute: (sql: string, params?: unknown[]) => Promise<[ResultSetHeader | RowDataPacket[], unknown[]]>;
    query: (sql: string, params?: unknown[]) => Promise<[ResultSetHeader | RowDataPacket[], unknown[]]>;
    getConnection: typeof getConnection;
};
export { pool, getConnection };
declare const _default: {
    pool: {
        execute: (sql: string, params?: unknown[]) => Promise<[ResultSetHeader | RowDataPacket[], unknown[]]>;
        query: (sql: string, params?: unknown[]) => Promise<[ResultSetHeader | RowDataPacket[], unknown[]]>;
        getConnection: typeof getConnection;
    };
    getConnection: typeof getConnection;
};
export default _default;
//# sourceMappingURL=database-shim.d.ts.map