import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './error';

export interface AuthUser {
  id: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authMiddleware: RequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'No token provided'));
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as AuthUser;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const roleGuard = (allowedRoles: string[]): RequestHandler => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied: insufficient permissions'));
    }
    next();
  };
};

export const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };
