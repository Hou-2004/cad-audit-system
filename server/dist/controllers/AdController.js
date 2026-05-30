"use strict";
// ============================================================
// 广告控制器
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdController = void 0;
const AdService_js_1 = require("../services/AdService.js");
const response_js_1 = require("../utils/response.js");
class AdController {
    // 获取所有位置的广告（公开，无需登录）
    static async getAll(req, res) {
        try {
            const ads = await AdService_js_1.AdService.getAllActiveAds();
            (0, response_js_1.success)(res, ads);
        }
        catch (err) {
            (0, response_js_1.success)(res, {}); // 广告获取失败不影响主流程
        }
    }
    // 获取指定位置广告（公开）
    static async getByPosition(req, res) {
        try {
            const position = req.params.position;
            const ads = await AdService_js_1.AdService.getAdsByPosition(position);
            (0, response_js_1.success)(res, ads);
        }
        catch (err) {
            (0, response_js_1.success)(res, []);
        }
    }
    // 记录点击（公开）
    static async click(req, res) {
        const adId = parseInt(req.params.id);
        if (adId) {
            const { AdvertisementRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/AdvertisementRepository.js')));
            AdvertisementRepository.incrementClicks(adId).catch(() => { });
        }
        (0, response_js_1.success)(res, null);
    }
    // 创建广告（超管）
    static async create(req, res) {
        const creatorId = req.user?.userId;
        const { title, image_url, link_url, position, start_time, end_time, sort_order } = req.body;
        if (!title || !image_url || !position || !start_time || !end_time) {
            res.status(400).json({ code: 400, message: '请填写完整的广告信息', data: null });
            return;
        }
        try {
            const adId = await AdService_js_1.AdService.createAd(creatorId, { title, image_url, link_url, position, start_time, end_time, sort_order });
            (0, response_js_1.success)(res, { id: adId }, '广告创建成功', 201);
        }
        catch (err) {
            res.status(400).json({ code: 400, message: err.message, data: null });
        }
    }
    // 更新广告（超管）
    static async update(req, res) {
        const adId = parseInt(req.params.id);
        try {
            await AdService_js_1.AdService.updateAd(adId, req.body);
            (0, response_js_1.success)(res, null, '广告更新成功');
        }
        catch (err) {
            res.status(404).json({ code: 404, message: err.message, data: null });
        }
    }
    // 删除广告（超管）
    static async delete(req, res) {
        const adId = parseInt(req.params.id);
        try {
            await AdService_js_1.AdService.deleteAd(adId);
            (0, response_js_1.success)(res, null, '广告已删除');
        }
        catch (err) {
            res.status(404).json({ code: 404, message: err.message, data: null });
        }
    }
    // 广告管理列表（超管）
    static async list(req, res) {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 20, 1), 50);
        const result = await AdService_js_1.AdService.getAllAds(page, pageSize);
        (0, response_js_1.paginated)(res, result.list, result.total, page, pageSize);
    }
}
exports.AdController = AdController;
