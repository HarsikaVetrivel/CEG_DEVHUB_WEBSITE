
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/errors.js';

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  next(new AppError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const message = isAppError ? error.message : 'Internal server error';

  // Log the actual exception to Render without logging credentials or request bodies.
  console.error('[API Error]', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorName: error.name,
    errorMessage: error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });

  const payload = {
    success: false,
    error: {
      message,
      code: isAppError ? 'APP_ERROR' : 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    },
  };

  res.status(statusCode).json(payload);
};
