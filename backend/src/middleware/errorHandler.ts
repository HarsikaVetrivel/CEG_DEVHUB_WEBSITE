import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/errors.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const message = isAppError ? error.message : 'Internal server error';

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
