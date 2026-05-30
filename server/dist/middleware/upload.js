"use strict";
// ============================================================
// 文件上传中间件 (支持分片上传)
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAdImage = exports.uploadChunk = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = __importDefault(require("../config/index.js"));
// 确保上传目录存在
const uploadDirs = {
    chunks: path_1.default.join(index_js_1.default.upload.dir, 'chunks'),
    files: path_1.default.join(index_js_1.default.upload.dir, 'files'),
    reports: path_1.default.join(index_js_1.default.upload.dir, 'reports'),
    ads: path_1.default.join(index_js_1.default.upload.dir, 'ads'),
};
for (const dir of Object.values(uploadDirs)) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
// 文件过滤器
function fileFilter(_req, file, cb) {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (!index_js_1.default.upload.allowedExtensions.includes(ext)) {
        return cb(new Error(`不支持的文件格式: ${ext}。仅允许 ${index_js_1.default.upload.allowedExtensions.join(', ')}`));
    }
    cb(null, true);
}
// 单文件上传（用于普通场景）
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination(_req, _file, cb) {
            cb(null, uploadDirs.files);
        },
        filename(_req, file, cb) {
            const uniqueName = `${Date.now()}-${crypto_1.default.randomBytes(8).toString('hex')}${path_1.default.extname(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
    limits: {
        fileSize: index_js_1.default.upload.maxSize,
    },
    fileFilter,
});
// 分片上传存储配置
const chunkStorage = multer_1.default.diskStorage({
    destination(_req, _file, cb) {
        cb(null, uploadDirs.chunks);
    },
    filename(req, file, cb) {
        const uploadId = req.body?.uploadId || 'unknown';
        const chunkIndex = req.body?.chunkIndex || '0';
        cb(null, `${uploadId}-${chunkIndex}`);
    },
});
// 分片上传中间件
exports.uploadChunk = (0, multer_1.default)({
    storage: chunkStorage,
    limits: {
        fileSize: index_js_1.default.upload.chunkSize + 1024, // 允许略超
    },
    fileFilter,
}).single('chunk');
// 广告图片上传
exports.uploadAdImage = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination(_req, _file, cb) {
            cb(null, uploadDirs.ads);
        },
        filename(_req, file, cb) {
            const uniqueName = `ad-${Date.now()}-${crypto_1.default.randomBytes(4).toString('hex')}${path_1.default.extname(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 广告图片最大5MB
    fileFilter(_req, file, cb) {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            return cb(new Error(`不支持的图片格式: ${ext}`));
        }
        cb(null, true);
    },
});
