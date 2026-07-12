import type { Request, Response } from 'express';
import { issueService } from '../../services/issues/issue.service.js';
import { uploadService } from '../../services/upload/upload.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import type { PublicCreateIssueInput } from '../../validators/issue.validator.js';

export class PublicIssueController {
  report = asyncHandler(async (req: Request, res: Response) => {
    const issue = await issueService.createPublic(
      String(req.params.id),
      req.body as PublicCreateIssueInput,
    );
    sendSuccess(res, issue, 201, 'Issue reported');
  });

  uploadEvidence = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError('Evidence file is required', 400);
    }
    const uploaded = await uploadService.uploadEvidence(file);
    sendSuccess(res, uploaded, 201, 'Evidence uploaded');
  });
}

export const publicIssueController = new PublicIssueController();
