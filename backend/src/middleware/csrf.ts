import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const csrfTokenHandler = (req: Request, res: Response) => {
  req.session.csrfToken ??= randomBytes(32).toString('hex');
  res.json({ success: true, data: { csrfToken: req.session.csrfToken } });
};

export const requireCsrf = (req: Request, res: Response, next: NextFunction) => {
  const expected = req.session.csrfToken;
  const supplied = req.get('X-CSRF-Token');

  if (!expected || !supplied) {
    return res.status(403).json({
      success: false,
      error: { message: 'CSRF token is required.' },
    });
  }

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return res.status(403).json({
      success: false,
      error: { message: 'CSRF token is invalid.' },
    });
  }

  return next();
};
