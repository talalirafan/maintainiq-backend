import type { Response } from 'express';
import { assetService } from '../../services/assets/asset.service.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import type {
  AssignTechnicianInput,
  CreateAssetInput,
  ListAssetsQuery,
  UpdateAssetInput,
} from '../../validators/asset.validator.js';

export class AssetController {
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const asset = await assetService.create(req.body as CreateAssetInput, req.user!.id);
    sendSuccess(res, asset, 201, 'Asset created');
  });

  list = asyncHandler(async (req, res) => {
    const result = await assetService.list(req.query as unknown as ListAssetsQuery);
    sendSuccess(res, result);
  });

  getById = asyncHandler(async (req, res) => {
    const asset = await assetService.getById(String(req.params.id));
    sendSuccess(res, asset);
  });

  update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const asset = await assetService.update(
      String(req.params.id),
      req.body as UpdateAssetInput,
      req.user!.id,
    );
    sendSuccess(res, asset, 200, 'Asset updated');
  });

  assign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const asset = await assetService.assignTechnician(
      String(req.params.id),
      req.body as AssignTechnicianInput,
      req.user!.id,
    );
    sendSuccess(res, asset, 200, 'Technician assignment updated');
  });

  remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await assetService.remove(String(req.params.id), req.user!.id);
    sendSuccess(res, { ok: true }, 200, 'Asset deleted');
  });

  history = asyncHandler(async (req, res) => {
    const history = await assetService.listHistory(String(req.params.id));
    sendSuccess(res, history);
  });
}

export const assetController = new AssetController();
