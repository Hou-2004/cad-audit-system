// ============================================================
// 配置中心 - 集中管理所有环境变量
// 启动时验证，缺少必要变量则立即失败 (fail-fast)
// ============================================================

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[配置错误] 缺少必需的环境变量: ${name}`);
  }
  return value.trim();
}

function intEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
}

function boolEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.toLowerCase();
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

export const config = {
  // 服务配置
  port: intEnv('PORT', 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // 数据库配置
  database: {
    host: requireEnv('DB_HOST'),
    port: intEnv('DB_PORT', 3306),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    name: requireEnv('DB_NAME'),
    waitForConnections: true,
    connectionLimit: intEnv('DB_POOL_SIZE', 10),
    maxIdle: intEnv('DB_MAX_IDLE', 5),
    idleTimeout: intEnv('DB_IDLE_TIMEOUT', 60000),
    enableKeepAlive: true,
    keepAliveInitialDelay: intEnv('DB_KEEPALIVE_DELAY', 10000),
  },

  // JWT 配置
  auth: {
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptSaltRounds: intEnv('BCRYPT_SALT_ROUNDS', 12),
  },

  // 文件存储配置
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: intEnv('MAX_FILE_SIZE', 100 * 1024 * 1024), // 100MB
    chunkSize: intEnv('CHUNK_SIZE', 5 * 1024 * 1024),   // 5MB per chunk
    allowedExtensions: ['.dwg', '.dxf', '.dwf'],
    allowedMimeTypes: [
      'application/dwg',
      'application/x-dwg',
      'image/x-dwg',
      'application/dxf',
      'application/x-dxf',
      'text/plain',
      'application/octet-stream',
    ],
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // 支付
  paymentMode: process.env.PAYMENT_MODE || 'mock',

  // 日志
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

} as const;

export default config;
