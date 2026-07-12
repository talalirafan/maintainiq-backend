import { Router } from 'express';
import { assetController } from '../controllers/assets/asset.controller.js';
import { qrController } from '../controllers/assets/qr.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../types/enums.js';
import {
  assignTechnicianSchema,
  createAssetSchema,
  listAssetsQuerySchema,
  updateAssetSchema,
} from '../validators/asset.validator.js';
import { qrDownloadSchema, qrPreviewSchema } from '../validators/qr.validator.js';

const assetsRouter = Router();

assetsRouter.use(authenticate);

assetsRouter.get(
  '/',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(listAssetsQuerySchema, 'query'),
  assetController.list,
);

assetsRouter.post(
  '/',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR),
  validate(createAssetSchema),
  assetController.create,
);

assetsRouter.get(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  assetController.getById,
);

assetsRouter.get(
  '/:id/history',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  assetController.history,
);

assetsRouter.patch(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR),
  validate(updateAssetSchema),
  assetController.update,
);

assetsRouter.post(
  '/:id/assign',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR),
  validate(assignTechnicianSchema),
  assetController.assign,
);

assetsRouter.delete(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR),
  assetController.remove,
);

// QR Code Endpoints
assetsRouter.get(
  '/:id/qr/preview',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(qrPreviewSchema, 'query'),
  qrController.preview,
);

assetsRouter.get(
  '/:id/qr/download',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  validate(qrDownloadSchema, 'query'),
  qrController.download,
);

assetsRouter.get(
  '/:id/qr/metadata',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  qrController.metadata,
);

assetsRouter.post(
  '/:id/qr/generate',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR, ROLES.TECHNICIAN, ROLES.REPORTER),
  qrController.generate,
);

export default assetsRouter;
