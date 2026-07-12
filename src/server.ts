import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env, assertCriticalEnv } from './config/env.js';
import { connectToDatabase } from './database/connection.js';
import router from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { setupSwagger } from './swagger/setup.js';
import { authService } from './services/auth/auth.service.js';
import { startJobs } from './jobs/index.js';

assertCriticalEnv();

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = new Set([env.clientUrl, ...env.clientUrls].filter(Boolean));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        const host = new URL(origin).hostname;
        if (allowedOrigins.has(origin) || host.endsWith('.vercel.app')) {
          callback(null, true);
          return;
        }
      } catch {
        // ignore invalid origin
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(compression());
app.use(express.json({ limit: `${env.maxUploadSizeMb}mb` }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/api', apiRateLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'maintainiq-backend',
    phase: 9,
    timestamp: new Date().toISOString(),
  });
});

setupSwagger(app);

app.use('/api', router);
app.use(notFoundHandler);
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  await connectToDatabase();

  const { default: mongoose } = await import('mongoose');
  if (mongoose.connection.readyState === 1) {
    await authService.ensureBootstrapAdmin();
  } else {
    console.warn('[server] Skipping bootstrap admin — MongoDB is not connected');
  }

  startJobs();

  app.listen(env.port, () => {
    console.log(`[server] MaintainIQ backend listening on port ${env.port}`);
    console.log(`[server] Phase 9 History module ready`);
  });
}

void bootstrap();

export default app;
