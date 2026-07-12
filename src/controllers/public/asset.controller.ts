import type { Request, Response } from 'express';
import { publicAssetService } from '../../services/public/publicAsset.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Unauthenticated public asset endpoints.
 * Returns only safe fields suitable for QR-scanned visitors.
 */
export class PublicAssetController {
  getPublicAsset = asyncHandler(async (req: Request, res: Response) => {
    const asset = await publicAssetService.getSafeAsset(String(req.params.id));
    sendSuccess(res, asset);
  });

  getPublicActivity = asyncHandler(async (req: Request, res: Response) => {
    const activity = await publicAssetService.getSafeActivity(String(req.params.id));
    sendSuccess(res, activity);
  });
}

export const publicAssetController = new PublicAssetController();
