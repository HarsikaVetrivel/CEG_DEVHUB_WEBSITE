import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';

import { loginSchema, registerSchema, updateProfileSchema } from '../validators/auth.js';
import { createError } from '../utils/errors.js';
import User from '../models/User.js';
import {
  registerUser, findUserByEmail, updateProfile, changePassword,
  forgotPassword, resetPassword,
} from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfTokenHandler, requireCsrf } from '../middleware/csrf.js';

// Same strong-password rule used in registerSchema — applied to all password-change flows too
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g. @, #, !).');

const router = Router();

router.get('/csrf', csrfTokenHandler);

const loginResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: z.object({
      id: z.string(),
      fullName: z.string(),
      email: z.string(),
      role: z.enum(['STUDENT', 'ADMIN']),
    }),
  }),
});

router.post('/register', requireCsrf, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstFieldError = Object.values(flat.fieldErrors).flat()[0];
      const firstFormError  = flat.formErrors[0];
      return res.status(400).json({ success: false, error: { message: firstFieldError ?? firstFormError ?? 'Validation failed.', details: flat } });
    }

    const { fullName, email, password } = parsed.data;
    const user = await registerUser({ fullName, email, password });

    return res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', requireCsrf, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstFieldError = Object.values(flat.fieldErrors).flat()[0];
      const firstFormError  = flat.formErrors[0];
      return res.status(400).json({ success: false, error: { message: firstFieldError ?? firstFormError ?? 'Validation failed.', details: flat } });
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user || !user.isActive) {
      throw createError(401, 'Invalid email or password.');
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      throw createError(401, 'Invalid email or password.');
    }

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((error) => (error ? reject(error) : resolve()));
    });
    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    req.session.csrfToken = randomBytes(32).toString('hex');

    user.lastLoginAt = new Date();
    await user.save();

    const payload = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };

    const validated = loginResponseSchema.safeParse({ success: true, data: { user: payload } });
    if (!validated.success) {
      throw createError(500, 'User payload validation failed.');
    }

    await new Promise<void>((resolve, reject) => {
      req.session.save((error) => (error ? reject(error) : resolve()));
    });

    return res.json({
      success: true,
      data: { user: payload, csrfToken: req.session.csrfToken },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireAuth, requireCsrf, (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Unable to log out cleanly.' },
      });
    }

    res.clearCookie('ceg_dev_hub_sid');
    return res.json({ success: true, data: { message: 'Logged out successfully.' } });
  });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      throw createError(404, 'User not found.');
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          yearOfStudy: user.yearOfStudy ?? null,
          course: user.course ?? null,
          interestedDomains: user.interestedDomains ?? [],
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/auth/profile
 * Update current user's full name and/or email.
 */
router.patch('/profile', requireAuth, requireCsrf, async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed.', details: parsed.error.flatten() },
      });
    }
    const updated = await updateProfile(req.user!.id, parsed.data);
    return res.json({ success: true, data: { user: updated } });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/auth/password
 * Change current user's password. Requires the current password for verification.
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: strongPassword,
  confirmNewPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmNewPassword, {
  message: 'New passwords do not match.',
  path: ['confirmNewPassword'],
});

router.patch('/password', requireAuth, requireCsrf, async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed.', details: parsed.error.flatten() },
      });
    }
    await changePassword(req.user!.id, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    return res.json({ success: true, data: { message: 'Password updated successfully.' } });
  } catch (error) {
    return next(error);
  }
});

// ── POST /auth/forgot-password ───────────────────────────────────
router.post('/forgot-password', requireCsrf, async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Email is required.' } });
    }
    // Always returns success to prevent email enumeration
    await forgotPassword(email);
    return res.json({
      success: true,
      data: { message: 'If an account with that email exists, a reset link has been sent.' },
    });
  } catch (error) {
    return next(error);
  }
});

// ── POST /auth/reset-password ─────────────────────────────────────
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: strongPassword,
  confirmNewPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmNewPassword, {
  message: 'Passwords do not match.',
  path: ['confirmNewPassword'],
});

router.post('/reset-password', requireCsrf, async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed.', details: parsed.error.flatten() },
      });
    }
    const result = await resetPassword(parsed.data.token, parsed.data.newPassword);
    return res.json({
      success: true,
      data: { message: 'Password reset successfully. You can now sign in.', email: result.email },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
