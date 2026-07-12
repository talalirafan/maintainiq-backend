import type { Response } from 'express';
import { maintenanceService } from '../../services/maintenance/maintenance.service.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import type {
  CompleteMaintenanceInput,
  ListMaintenanceQuery,
  StartMaintenanceInput,
  UpdateMaintenanceInput,
} from '../../validators/maintenance.validator.js';

export class MaintenanceController {
  list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await maintenanceService.list(req.query as unknown as ListMaintenanceQuery);
    sendSuccess(res, result);
  });

  getById = asyncHandler(async (req, res) => {
    const record = await maintenanceService.getById(String(req.params.id));
    sendSuccess(res, record);
  });

  getByIssue = asyncHandler(async (req, res) => {
    const record = await maintenanceService.getByIssue(String(req.params.issueId));
    sendSuccess(res, record);
  });

  start = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const record = await maintenanceService.start(req.body as StartMaintenanceInput, {
      id: req.user!.id,
      role: req.user!.role,
    });
    sendSuccess(res, record, 201, 'Maintenance started');
  });

  update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const record = await maintenanceService.update(
      String(req.params.id),
      req.body as UpdateMaintenanceInput,
      { id: req.user!.id, role: req.user!.role },
    );
    sendSuccess(res, record, 200, 'Maintenance updated');
  });

  complete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const record = await maintenanceService.complete(
      String(req.params.id),
      req.body as CompleteMaintenanceInput,
      { id: req.user!.id, role: req.user!.role },
    );
    sendSuccess(res, record, 200, 'Maintenance completed');
  });
}

export const maintenanceController = new MaintenanceController();
