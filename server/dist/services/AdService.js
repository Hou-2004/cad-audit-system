"use strict";
// ============================================================
// 广告管理服务
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdService = void 0;
const AdvertisementRepository_js_1 = require("../repositories/AdvertisementRepository.js");
class AdService {
    /**
     * 获取指定位置的有效广告
     */
    static async getAdsByPosition(position) {
        const ads = await AdvertisementRepository_js_1.AdvertisementRepository.getActiveByPosition(position);
        // 异步增加展示数（不等待）
        if (ads.length > 0) {
            AdvertisementRepository_js_1.AdvertisementRepository.incrementImpressions(ads.map((a) => a.id)).catch(() => { });
        }
        return ads;
    }
    /**
     * 获取所有位置的广告（供前端一次性获取）
     */
    static async getAllActiveAds() {
        const positions = ['homepage_banner', 'sidebar', 'dashboard_top', 'interstitial'];
        const result = {};
        await Promise.all(positions.map(async (pos) => {
            result[pos] = await this.getAdsByPosition(pos);
        }));
        return result;
    }
    /**
     * 创建广告（超管）
     */
    static async createAd(creatorId, data) {
        return await AdvertisementRepository_js_1.AdvertisementRepository.create(data);
    }
    /**
     * 更新广告
     */
    static async updateAd(adId, data) {
        const updated = await AdvertisementRepository_js_1.AdvertisementRepository.update(adId, data);
        if (!updated)
            throw new Error('广告不存在或更新失败');
    }
    /**
     * 删除广告
     */
    static async deleteAd(adId) {
        const deleted = await AdvertisementRepository_js_1.AdvertisementRepository.delete(adId);
        if (!deleted)
            throw new Error('广告不存在');
    }
    /**
     * 获取所有广告列表（超管后台）
     */
    static async getAllAds(page, pageSize) {
        return await AdvertisementRepository_js_1.AdvertisementRepository.findAll(page, pageSize);
    }
}
exports.AdService = AdService;
