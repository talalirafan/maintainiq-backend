import { Router } from 'express';
import { sendSuccess } from '../utils/apiResponse.js';
import authRouter from './auth.routes.js';
import usersRouter from './users.routes.js';
import assetsRouter from './assets.routes.js';
import publicRouter from './public.routes.js';
import issuesRouter from './issues.routes.js';
import uploadRouter from './upload.routes.js';
import aiRouter from './ai.routes.js';
import maintenanceRouter from './maintenance.routes.js';
import historyRouter from './history.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  sendSuccess(res, {
    name: 'MaintainIQ API',
    version: '0.9.0',
    phase: 9,
    modules: [
      '/api/auth',
      '/api/assets',
      '/api/issues',
      '/api/maintenance',
      '/api/ai',
      '/api/history',
      '/api/users',
      '/api/dashboard',
      '/api/upload',
      '/api/notifications',
      '/api/settings',
      '/api/public',
    ],
  });
});

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/assets', assetsRouter);
router.use('/issues', issuesRouter);
router.use('/maintenance', maintenanceRouter);
router.use('/ai', aiRouter);
router.use('/upload', uploadRouter);
router.use('/public', publicRouter);
router.use('/history', historyRouter);

router.use('/dashboard', (_req, res) => {
  sendSuccess(res, { module: 'dashboard', status: 'skeleton' }, 501, 'Dashboard module — Phase 10');
});

router.use('/notifications', (_req, res) => {
  sendSuccess(
    res,
    { module: 'notifications', status: 'skeleton' },
    501,
    'Notifications module — upcoming',
  );
});

router.use('/settings', (_req, res) => {
  sendSuccess(res, { module: 'settings', status: 'skeleton' }, 501, 'Settings module — upcoming');
});

export default router;
