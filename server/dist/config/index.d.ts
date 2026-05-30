export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly isDev: boolean;
    readonly isProd: boolean;
    readonly database: {
        readonly host: string;
        readonly port: number;
        readonly user: string;
        readonly password: string;
        readonly name: string;
        readonly waitForConnections: true;
        readonly connectionLimit: number;
        readonly maxIdle: number;
        readonly idleTimeout: number;
        readonly enableKeepAlive: true;
        readonly keepAliveInitialDelay: number;
    };
    readonly auth: {
        readonly jwtSecret: string;
        readonly jwtExpiresIn: string;
        readonly jwtRefreshSecret: string;
        readonly jwtRefreshExpiresIn: string;
        readonly bcryptSaltRounds: number;
    };
    readonly upload: {
        readonly dir: string;
        readonly maxSize: number;
        readonly chunkSize: number;
        readonly allowedExtensions: readonly [".dwg", ".dxf", ".dwf"];
        readonly allowedMimeTypes: readonly ["application/dwg", "application/x-dwg", "image/x-dwg", "application/dxf", "application/x-dxf", "text/plain", "application/octet-stream"];
    };
    readonly corsOrigin: string;
    readonly paymentMode: string;
    readonly logLevel: string;
};
export default config;
//# sourceMappingURL=index.d.ts.map