import { Router } from 'express';
import { aiController } from '../controllers/ai/ai.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../types/enums.js';
import {
  maintenanceSummaryRequestSchema,
  triageRequestSchema,
} from '../validators/ai.validator.js';

const aiRouter = Router();

aiRouter.post(
  '/triage',
  authenticate,
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(triageRequestSchema),
  aiController.triage,
);

aiRouter.post(
  '/maintenance-summary',
  authenticate,
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(maintenanceSummaryRequestSchema),
  aiController.maintenanceSummary,
);

export default aiRouter;
