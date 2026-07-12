import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthUserPayload } from '../types/api.js';
import { AppError } from './AppError.js';

function requireSecret(secret: string, name: string): string {
  if (!secret) {
    if (env.nodeEnv === 'production') {
      throw new AppError(`${name} is not configured`, 500);
    }
    return `dev-${name.toLowerCase()}-secret-change-me`;
  }
  return secret;
}

function signOptions(expiresIn: string): SignOptions {
  return { expiresIn: expiresIn as SignOptions['expiresIn'] };
}

export function signAccessToken(payload: AuthUserPayload): string {
  return jwt.sign(
    payload,
    requireSecret(env.jwt.accessSecret, 'JWT_ACCESS_SECRET'),
    signOptions(env.jwt.accessExpiresIn),
  );
}

export function signRefreshToken(payload: AuthUserPayload): string {
  return jwt.sign(
    payload,
    requireSecret(env.jwt.refreshSecret, 'JWT_REFRESH_SECRET'),
    signOptions(env.jwt.refreshExpiresIn),
  );
}

export function verifyAccessToken(token: string): AuthUserPayload {
  try {
    return jwt.verify(
      token,
      requireSecret(env.jwt.accessSecret, 'JWT_ACCESS_SECRET'),
    ) as AuthUserPayload;
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
}

export function verifyRefreshToken(token: string): AuthUserPayload {
  try {
    return jwt.verify(
      token,
      requireSecret(env.jwt.refreshSecret, 'JWT_REFRESH_SECRET'),
    ) as AuthUserPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

export function getRefreshExpiryDate(): Date {
  const match = /^(\d+)([smhd])$/i.exec(env.jwt.refreshExpiresIn);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return new Date(Date.now() + amount * (multipliers[unit] ?? 86_400_000));
}
