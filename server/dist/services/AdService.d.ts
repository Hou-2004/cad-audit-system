import { AdPosition } from '../types/index.js';
export declare class AdService {
    /**
     * 获取指定位置的有效广告
     */
    static getAdsByPosition(position: AdPosition): Promise<any[]>;
    /**
     * 获取所有位置的广告（供前端一次性获取）
     */
    static getAllActiveAds(): Promise<Record<AdPosition, any[]>>;
    /**
     * 创建广告（超管）
     */
    static createAd(creatorId: number, data: {
        title: string;
        image_url: string;
        link_url?: string;
        position: AdPosition;
        start_time: string;
        end_time: string;
        sort_order?: number;
    }): Promise<number>;
    /**
     * 更新广告
     */
    static updateAd(adId: number, data: any): Promise<void>;
    /**
     * 删除广告
     */
    static deleteAd(adId: number): Promise<void>;
    /**
     * 获取所有广告列表（超管后台）
     */
    static getAllAds(page: number, pageSize: number): Promise<any>;
}
//# sourceMappingURL=AdService.d.ts.map