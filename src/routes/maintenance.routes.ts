import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenance/maintenance.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../types/enums.js';
import {
  completeMaintenanceSchema,
  listMaintenanceQuerySchema,
  startMaintenanceSchema,
  updateMaintenanceSchema,
} from '../validators/maintenance.validator.js';

const maintenanceRouter = Router();

maintenanceRouter.use(authenticate);

maintenanceRouter.get(
  '/',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(listMaintenanceQuerySchema, 'query'),
  maintenanceController.list,
);

maintenanceRouter.post(
  '/start',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(startMaintenanceSchema),
  maintenanceController.start,
);

maintenanceRouter.get(
  '/by-issue/:issueId',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  maintenanceController.getByIssue,
);

maintenanceRouter.get(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  maintenanceController.getById,
);

maintenanceRouter.patch(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(updateMaintenanceSchema),
  maintenanceController.update,
);

maintenanceRouter.post(
  '/:id/complete',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(completeMaintenanceSchema),
  maintenanceController.complete,
);

export default maintenanceRouter;
