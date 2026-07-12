import { Router } from 'express';
import { issueController } from '../controllers/issues/issue.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../types/enums.js';
import {
  assignIssueSchema,
  createIssueSchema,
  listIssuesQuerySchema,
  reopenIssueSchema,
  resolveIssueSchema,
  transitionIssueSchema,
  updateIssueSchema,
} from '../validators/issue.validator.js';

const issuesRouter = Router();

issuesRouter.use(authenticate);

issuesRouter.get(
  '/',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(listIssuesQuerySchema, 'query'),
  issueController.list,
);

issuesRouter.post(
  '/',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(createIssueSchema),
  issueController.create,
);

issuesRouter.get(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  issueController.getById,
);

issuesRouter.patch(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(updateIssueSchema),
  issueController.update,
);

issuesRouter.post(
  '/:id/assign',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR),
  validate(assignIssueSchema),
  issueController.assign,
);

issuesRouter.post(
  '/:id/status',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(transitionIssueSchema),
  issueController.transition,
);

issuesRouter.post(
  '/:id/resolve',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(resolveIssueSchema),
  issueController.resolve,
);

issuesRouter.post(
  '/:id/reopen',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN),
  validate(reopenIssueSchema),
  issueController.reopen,
);

export default issuesRouter;
