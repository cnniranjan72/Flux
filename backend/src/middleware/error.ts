import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with this value already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    return res.status(400).json({ error: 'Database error: ' + err.meta?.message });
  }

  res.status(status).json({ error: message });
};
