import { AdPosition, AdStatus } from '../types/index.js';
export declare class AdvertisementRepository {
    static create(data: {
        title: string;
        image_url: string;
        link_url?: string | null;
        position: AdPosition;
        start_time: string;
        end_time: string;
        sort_order?: number;
    }): Promise<number>;
    static update(id: number, fields: Partial<{
        title: string;
        image_url: string;
        link_url: string;
        position: AdPosition;
        start_time: string;
        end_time: string;
        sort_order: number;
        status: AdStatus;
    }>): Promise<boolean>;
    static delete(id: number): Promise<boolean>;
    static getActiveByPosition(position: AdPosition): Promise<any[]>;
    static findAll(page: number, pageSize: number): Promise<{
        list: any[];
        total: number;
    }>;
    static incrementClicks(id: number): Promise<void>;
    static incrementImpressions(ids: number[]): Promise<void>;
}
//# sourceMappingURL=AdvertisementRepository.d.ts.map