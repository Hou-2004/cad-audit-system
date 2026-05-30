import { pool, getConnection } from './database-shim.js';
export declare const db: {
    execute: (sql: string, params?: unknown[]) => Promise<[import("./database-shim.js").ResultSetHeader | import("./database-shim.js").RowDataPacket[], unknown[]]>;
    query: (sql: string, params?: unknown[]) => Promise<[import("./database-shim.js").ResultSetHeader | import("./database-shim.js").RowDataPacket[], unknown[]]>;
    getConnection: typeof getConnection;
};
export { pool, getConnection };
export declare function testConnection(): Promise<void>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=database.d.ts.map