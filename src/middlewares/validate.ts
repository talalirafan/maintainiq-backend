import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';

type RequestTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, target: RequestTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[target]);

    if (!parsed.success) {
      next(new AppError('Validation failed', 422, parsed.error.flatten()));
      return;
    }

    req[target] = parsed.data;
    next();
  };
}
