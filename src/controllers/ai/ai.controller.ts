import type { Response } from 'express';
import { aiService } from '../../services/ai/ai.service.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import type {
  MaintenanceSummaryRequestInput,
  PublicTriageRequestInput,
  TriageRequestInput,
} from '../../validators/ai.validator.js';
import type { Request } from 'express';

export class AiController {
  triage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as TriageRequestInput;
    const result = await aiService.triage({
      assetId: body.assetId,
      complaint: body.complaint,
      requestedById: req.user?.id ?? null,
    });
    sendSuccess(res, result, 200, 'AI triage generated — edit before saving');
  });

  publicTriage = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as PublicTriageRequestInput;
    const result = await aiService.triage({
      assetId: String(req.params.id),
      complaint: body.complaint,
      requestedById: null,
    });
    sendSuccess(res, result, 200, 'AI triage generated — edit before saving');
  });

  maintenanceSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as MaintenanceSummaryRequestInput;
    const result = await aiService.maintenanceSummary(body);
    sendSuccess(res, result, 200, 'AI maintenance summary generated');
  });
}

export const aiController = new AiController();
