// ============================================================
// 广告控制器
// ============================================================

import { Request, Response } from 'express';
import { AdService } from '../services/AdService.js';
import { success, paginated } from '../utils/response.js';
import { authenticate, authorize } from '../middleware/auth.js';

export class AdController {
  // 获取所有位置的广告（公开，无需登录）
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const ads = await AdService.getAllActiveAds();
      success(res, ads);
    } catch (err: any) {
      success(res, {}); // 广告获取失败不影响主流程
    }
  }

  // 获取指定位置广告（公开）
  static async getByPosition(req: Request, res: Response): Promise<void> {
    try {
      const position = req.params.position as any;
      const ads = await AdService.getAdsByPosition(position);
      success(res, ads);
    } catch (err: any) {
      success(res, []);
    }
  }

  // 记录点击（公开）
  static async click(req: Request, res: Response): Promise<void> {
    const adId = parseInt(req.params.id);
    if (adId) {
      const { AdvertisementRepository } = await import('../repositories/AdvertisementRepository.js');
      AdvertisementRepository.incrementClicks(adId).catch(() => {});
    }
    success(res, null);
  }

  // 创建广告（超管）
  static async create(req: Request, res: Response): Promise<void> {
    const creatorId = (req as any).user?.userId;
    const { title, image_url, link_url, position, start_time, end_time, sort_order } = req.body;

    if (!title || !image_url || !position || !start_time || !end_time) {
      res.status(400).json({ code: 400, message: '请填写完整的广告信息', data: null }); return;
    }

    try {
      const adId = await AdService.createAd(creatorId, { title, image_url, link_url, position, start_time, end_time, sort_order });
      success(res, { id: adId }, '广告创建成功', 201);
    } catch (err: any) {
      res.status(400).json({ code: 400, message: err.message, data: null });
    }
  }

  // 更新广告（超管）
  static async update(req: Request, res: Response): Promise<void> {
    const adId = parseInt(req.params.id);
    try {
      await AdService.updateAd(adId, req.body);
      success(res, null, '广告更新成功');
    } catch (err: any) {
      res.status(404).json({ code: 404, message: err.message, data: null });
    }
  }

  // 删除广告（超管）
  static async delete(req: Request, res: Response): Promise<void> {
    const adId = parseInt(req.params.id);
    try {
      await AdService.deleteAd(adId);
      success(res, null, '广告已删除');
    } catch (err: any) {
      res.status(404).json({ code: 404, message: err.message, data: null });
    }
  }

  // 广告管理列表（超管）
  static async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 50);

    const result = await AdService.getAllAds(page, pageSize);
    paginated(res, result.list, result.total, page, pageSize);
  }
}
