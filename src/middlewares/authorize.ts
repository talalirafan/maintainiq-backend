import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../types/api.js';
import type { UserRole } from '../types/enums.js';
import { AppError } from '../utils/AppError.js';

export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action', 403));
      return;
    }

    next();
  };
}
