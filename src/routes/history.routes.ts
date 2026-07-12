import { Router } from 'express';
import { historyController } from '../controllers/history/history.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../types/enums.js';
import { listHistoryQuerySchema } from '../validators/history.validator.js';

/**
 * Append-only history feed. No PATCH/DELETE routes by design.
 */
const historyRouter = Router();

historyRouter.use(authenticate);

historyRouter.get(
  '/',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(listHistoryQuerySchema, 'query'),
  historyController.list,
);

historyRouter.get(
  '/summary',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  historyController.summary,
);

historyRouter.get(
  '/assets/:assetId',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(listHistoryQuerySchema, 'query'),
  historyController.listByAsset,
);

export default historyRouter;
