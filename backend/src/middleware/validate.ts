import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError } from './error';

export const validate =
  (schema: z.ZodSchema): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      const message = first
        ? `${first.path.join('.') || 'body'}: ${first.message}`
        : 'Invalid input';
      return next(new ApiError(400, message));
    }
    req.body = result.data;
    next();
  };

export const paginate = (skip: any, take: any, defaultTake = 20) => {
  const parsedTake = Math.min(parseInt(take as string, 10) || defaultTake, 100);
  const parsedSkip = Math.max(parseInt(skip as string, 10) || 0, 0);
  return { skip: parsedSkip, take: parsedTake };
};
