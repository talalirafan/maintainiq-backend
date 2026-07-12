import mongoose from 'mongoose';
import { env } from '../config/env.js';

export async function connectToDatabase(): Promise<void> {
  if (!env.mongoUri) {
    console.warn('[database] MONGO_URI is not defined. Skipping connection (Phase 1 shell).');
    return;
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri);
    console.log('[database] Connected to MongoDB');
  } catch (error) {
    console.error('[database] MongoDB connection failed', error);
    if (env.nodeEnv === 'production') {
      process.exit(1);
    }
  }
}
