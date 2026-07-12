import type { NextFunction, Response } from 'express';
import { userRepository } from '../repositories/user.repository.js';
import type { AuthenticatedRequest } from '../types/api.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.id);

    if (!user || !user.isActive) {
      throw new AppError('Account is inactive or does not exist', 401);
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('Authentication required', 401));
  }
}
