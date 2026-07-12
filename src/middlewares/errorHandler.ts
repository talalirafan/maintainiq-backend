import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
      ...(err.errors !== undefined ? { errors: err.errors } : {}),
    });
    return;
  }

  console.error('[error]', err);

  res.status(500).json({
    success: false,
    message: env.nodeEnv === 'production' ? 'Internal Server Error' : String(err),
    statusCode: 500,
  });
}
