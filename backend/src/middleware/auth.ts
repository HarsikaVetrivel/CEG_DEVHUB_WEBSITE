import type { NextFunction, Request, Response } from 'express';

import { createError } from '../utils/errors.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(createError(401, 'Authentication required.'));
  }

  return next();
};

export const requireRole = (allowedRoles: Array<'STUDENT' | 'ADMIN'>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(createError(403, 'You do not have permission to access this resource.'));
    }

    return next();
  };
};
