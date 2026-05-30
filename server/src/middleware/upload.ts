// ============================================================
// 文件上传中间件 (支持分片上传)
// ============================================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import config from '../config/index.js';

// 确保上传目录存在
const uploadDirs = {
  chunks: path.join(config.upload.dir, 'chunks'),
  files: path.join(config.upload.dir, 'files'),
  reports: path.join(config.upload.dir, 'reports'),
  ads: path.join(config.upload.dir, 'ads'),
};

for (const dir of Object.values(uploadDirs)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 文件过滤器
function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!config.upload.allowedExtensions.includes(ext)) {
    return cb(new Error(`不支持的文件格式: ${ext}。仅允许 ${config.upload.allowedExtensions.join(', ')}`));
  }
  cb(null, true);
}

// 单文件上传（用于普通场景）
export const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, uploadDirs.files);
    },
    filename(_req, file, cb) {
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: config.upload.maxSize,
  },
  fileFilter,
});

// 分片上传存储配置
const chunkStorage = multer.diskStorage({
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
export const uploadChunk = multer({
  storage: chunkStorage,
  limits: {
    fileSize: config.upload.chunkSize + 1024, // 允许略超
  },
  fileFilter,
}).single('chunk');

// 广告图片上传
export const uploadAdImage = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, uploadDirs.ads);
    },
    filename(_req, file, cb) {
      const uniqueName = `ad-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 广告图片最大5MB
  fileFilter(_req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error(`不支持的图片格式: ${ext}`));
    }
    cb(null, true);
  },
});
