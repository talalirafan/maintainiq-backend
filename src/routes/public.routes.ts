import { Router } from 'express';
import { publicAssetController } from '../controllers/public/asset.controller.js';
import { publicIssueController } from '../controllers/public/issue.controller.js';
import { aiController } from '../controllers/ai/ai.controller.js';
import { publicRateLimiter } from '../middlewares/rateLimiter.js';
import { evidenceUpload } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { publicCreateIssueSchema } from '../validators/issue.validator.js';
import { publicTriageRequestSchema } from '../validators/ai.validator.js';

const publicRouter = Router();

publicRouter.use(publicRateLimiter);

/** No authentication — QR landing + public issue reporting + AI triage. */
publicRouter.get('/assets/:id', publicAssetController.getPublicAsset);
publicRouter.get('/assets/:id/activity', publicAssetController.getPublicActivity);

publicRouter.post(
  '/assets/:id/triage',
  validate(publicTriageRequestSchema),
  aiController.publicTriage,
);

publicRouter.post(
  '/assets/:id/issues',
  validate(publicCreateIssueSchema),
  publicIssueController.report,
);

publicRouter.post(
  '/assets/:id/evidence',
  evidenceUpload.single('file'),
  publicIssueController.uploadEvidence,
);

export default publicRouter;
