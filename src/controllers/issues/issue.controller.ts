import type { Response } from 'express';
import { issueService } from '../../services/issues/issue.service.js';
import { uploadService } from '../../services/upload/upload.service.js';
import { userRepository } from '../../repositories/user.repository.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import type {
  AssignIssueInput,
  CreateIssueInput,
  ListIssuesQuery,
  ReopenIssueInput,
  ResolveIssueInput,
  TransitionIssueInput,
  UpdateIssueInput,
} from '../../validators/issue.validator.js';

export class IssueController {
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const issue = await issueService.createAuthenticated(req.body as CreateIssueInput, {
      id: String(user._id),
      name: user.name,
      email: user.email,
    });
    sendSuccess(res, issue, 201, 'Issue created');
  });

  list = asyncHandler(async (req, res) => {
    const result = await issueService.list(req.query as unknown as ListIssuesQuery);
    sendSuccess(res, result);
  });

  getById = asyncHandler(async (req, res) => {
    const issue = await issueService.getById(String(req.params.id));
    sendSuccess(res, issue);
  });

  update = asyncHandler(async (req, res) => {
    const issue = await issueService.update(String(req.params.id), req.body as UpdateIssueInput);
    sendSuccess(res, issue, 200, 'Issue updated');
  });

  assign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const issue = await issueService.assign(
      String(req.params.id),
      req.body as AssignIssueInput,
      req.user!.id,
    );
    sendSuccess(res, issue, 200, 'Issue assigned');
  });

  transition = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const issue = await issueService.transition(
      String(req.params.id),
      req.body as TransitionIssueInput,
      req.user!.id,
    );
    sendSuccess(res, issue, 200, 'Issue status updated');
  });

  resolve = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const issue = await issueService.resolve(
      String(req.params.id),
      req.body as ResolveIssueInput,
      req.user!.id,
    );
    sendSuccess(res, issue, 200, 'Issue resolved');
  });

  reopen = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const issue = await issueService.reopen(
      String(req.params.id),
      (req.body ?? {}) as ReopenIssueInput,
      req.user!.id,
    );
    sendSuccess(res, issue, 200, 'Issue reopened');
  });
}

export class UploadController {
  evidence = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError('Evidence file is required', 400);
    }
    const uploaded = await uploadService.uploadEvidence(file);
    sendSuccess(res, uploaded, 201, 'Evidence uploaded');
  });
}

export const issueController = new IssueController();
export const uploadController = new UploadController();
