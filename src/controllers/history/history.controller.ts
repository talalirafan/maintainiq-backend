import type { Response } from 'express';
import { historyService } from '../../services/history/history.service.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import type { ListHistoryQuery } from '../../validators/history.validator.js';

export class HistoryController {
  list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await historyService.list(req.query as unknown as ListHistoryQuery);
    sendSuccess(res, result);
  });

  listByAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query as unknown as ListHistoryQuery;
    const result = await historyService.listByAsset(String(req.params.assetId), query);
    sendSuccess(res, result);
  });

  summary = asyncHandler(async (_req, res) => {
    const result = await historyService.eventSummary();
    sendSuccess(res, result);
  });
}

export const historyController = new HistoryController();
