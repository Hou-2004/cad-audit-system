// ============================================================
// 广告管理服务
// ============================================================

import { AdvertisementRepository } from '../repositories/AdvertisementRepository.js';
import { AdPosition, AdStatus } from '../types/index.js';

export class AdService {

  /**
   * 获取指定位置的有效广告
   */
  static async getAdsByPosition(position: AdPosition): Promise<any[]> {
    const ads = await AdvertisementRepository.getActiveByPosition(position);

    // 异步增加展示数（不等待）
    if (ads.length > 0) {
      AdvertisementRepository.incrementImpressions(ads.map((a) => a.id)).catch(() => {});
    }

    return ads;
  }

  /**
   * 获取所有位置的广告（供前端一次性获取）
   */
  static async getAllActiveAds(): Promise<Record<AdPosition, any[]>> {
    const positions: AdPosition[] = ['homepage_banner', 'sidebar', 'dashboard_top', 'interstitial'];
    const result: Record<string, any[]> = {};

    await Promise.all(
      positions.map(async (pos) => {
        result[pos] = await this.getAdsByPosition(pos);
      }),
    );

    return result as Record<AdPosition, any[]>;
  }

  /**
   * 创建广告（超管）
   */
  static async createAd(creatorId: number, data: {
    title: string;
    image_url: string;
    link_url?: string;
    position: AdPosition;
    start_time: string;
    end_time: string;
    sort_order?: number;
  }): Promise<number> {
    return await AdvertisementRepository.create(data);
  }

  /**
   * 更新广告
   */
  static async updateAd(adId: number, data: any): Promise<void> {
    const updated = await AdvertisementRepository.update(adId, data);
    if (!updated) throw new Error('广告不存在或更新失败');
  }

  /**
   * 删除广告
   */
  static async deleteAd(adId: number): Promise<void> {
    const deleted = await AdvertisementRepository.delete(adId);
    if (!deleted) throw new Error('广告不存在');
  }

  /**
   * 获取所有广告列表（超管后台）
   */
  static async getAllAds(page: number, pageSize: number): Promise<any> {
    return await AdvertisementRepository.findAll(page, pageSize);
  }
}
