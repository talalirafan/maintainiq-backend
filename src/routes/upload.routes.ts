import { Router } from 'express';
import { uploadController } from '../controllers/issues/issue.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { evidenceUpload } from '../middlewares/upload.js';
import { ROLES } from '../types/enums.js';

const uploadRouter = Router();

uploadRouter.post(
  '/evidence',
  authenticate,
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  evidenceUpload.single('file'),
  uploadController.evidence,
);

export default uploadRouter;
