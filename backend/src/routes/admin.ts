import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { createError } from '../utils/errors.js';
import {
  HACKATHON_DOMAINS,
  HACKATHON_LIFECYCLE_STATUSES,
  HACKATHON_LISTING_STATUSES,
  HACKATHON_MODES,
  HACKATHON_SOURCE_TYPES,
  adminCreateHackathon,
  adminDeleteHackathon,
  adminGetHackathon,
  adminListHackathons,
  adminSetListingStatus,
  adminUpdateHackathon,
} from '../services/admin.js';

const router = Router();

// All admin routes require auth + ADMIN role
router.use(requireAuth, requireRole(['ADMIN']));

// ── Zod schemas ───────────────────────────────────────────────────
const hackathonBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  organizer: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(12000),
  registrationUrl: z.string().url('Must be a valid URL.'),
  startDate: z.string().datetime({ offset: true }).or(z.string().date()),
  endDate: z.string().datetime({ offset: true }).or(z.string().date()),
  registrationDeadline: z.string().datetime({ offset: true }).or(z.string().date()),
  location: z.string().trim().min(2).max(200),
  mode: z.enum(HACKATHON_MODES),
  domains: z.array(z.enum(HACKATHON_DOMAINS)).min(1, 'At least one domain required.'),
  eligibility: z.string().trim().min(2).max(1000),
  minimumTeamSize: z.number().int().min(1).max(100),
  maximumTeamSize: z.number().int().min(1).max(100),
  prizeDetails: z.string().trim().min(2).max(2000),
  requiredSkills: z.array(z.string().trim()).default([]),
  lifecycleStatus: z.enum(HACKATHON_LIFECYCLE_STATUSES),
  listingStatus: z.enum(HACKATHON_LISTING_STATUSES).default('PENDING'),
  sourceType: z.enum(HACKATHON_SOURCE_TYPES).default('ADMIN'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  listingStatus: z.enum(HACKATHON_LISTING_STATUSES).optional(),
});

const idParamSchema = z.object({ id: z.string().min(24).max(24) });

const statusBodySchema = z.object({
  listingStatus: z.enum(HACKATHON_LISTING_STATUSES),
});

// ── GET /admin/hackathons — list all ─────────────────────────────
router.get('/hackathons', async (req, res, next) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid query parameters.', details: parsed.error.flatten() },
    });
  }
  try {
    const { page, limit, q, listingStatus } = parsed.data;
    const result = await adminListHackathons(page, limit, q, listingStatus);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

// ── GET /admin/hackathons/:id — single ───────────────────────────
router.get('/hackathons/:id', async (req, res, next) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid hackathon ID.' } });
  }
  try {
    const hackathon = await adminGetHackathon(parsed.data.id);
    return res.json({ success: true, data: { hackathon } });
  } catch (error) {
    return next(error);
  }
});

// ── POST /admin/hackathons — create ──────────────────────────────
router.post('/hackathons', requireCsrf, async (req, res, next) => {
  const parsed = hackathonBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed.', details: parsed.error.flatten() },
    });
  }
  try {
    const hackathon = await adminCreateHackathon(parsed.data as Parameters<typeof adminCreateHackathon>[0], req.user!.id);
    return res.status(201).json({ success: true, data: { hackathon } });
  } catch (error) {
    return next(error);
  }
});

// ── PUT /admin/hackathons/:id — update ───────────────────────────
router.put('/hackathons/:id', requireCsrf, async (req, res, next) => {
  const paramParsed = idParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid hackathon ID.' } });
  }
  const bodyParsed = hackathonBodySchema.partial().safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed.', details: bodyParsed.error.flatten() },
    });
  }
  try {
    const hackathon = await adminUpdateHackathon(
      paramParsed.data.id,
      bodyParsed.data as Parameters<typeof adminUpdateHackathon>[1],
      req.user!.id,
    );
    return res.json({ success: true, data: { hackathon } });
  } catch (error) {
    return next(error);
  }
});

// ── DELETE /admin/hackathons/:id — delete ────────────────────────
router.delete('/hackathons/:id', requireCsrf, async (req, res, next) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid hackathon ID.' } });
  }
  try {
    const result = await adminDeleteHackathon(parsed.data.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

// ── PATCH /admin/hackathons/:id/status — set listing status ──────
router.patch('/hackathons/:id/status', requireCsrf, async (req, res, next) => {
  const paramParsed = idParamSchema.safeParse(req.params);
  const bodyParsed = statusBodySchema.safeParse(req.body);
  if (!paramParsed.success || !bodyParsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid request.' } });
  }
  try {
    const hackathon = await adminSetListingStatus(
      paramParsed.data.id,
      bodyParsed.data.listingStatus,
      req.user!.id,
    );
    return res.json({ success: true, data: { hackathon } });
  } catch (error) {
    return next(error);
  }
});

// ── GET /admin/users — list all student accounts ─────────────────
const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  verified: z.enum(['true', 'false']).optional(),
});

router.get('/users', async (req, res, next) => {
  try {
    const parsed = userListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { message: 'Invalid query parameters.' } });
    }
    const { page, limit, q, verified } = parsed.data;

    // Inline import to avoid circular deps
    const User = (await import('../models/User.js')).default;

    const filter: Record<string, unknown> = { role: 'STUDENT' };
    if (q) filter['$or'] = [
      { fullName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
    if (verified !== undefined) filter['emailVerified'] = verified === 'true';

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('fullName email emailVerified isActive yearOfStudy course interestedDomains createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        items: users.map((u) => {
          const withTs = u as typeof u & { createdAt: Date };
          return {
            id: u._id.toString(),
            fullName: u.fullName,
            email: u.email,
            emailVerified: u.emailVerified,
            isActive: u.isActive,
            yearOfStudy: u.yearOfStudy ?? null,
            course: u.course ?? null,
            interestedDomains: u.interestedDomains ?? [],
            joinedAt: withTs.createdAt,
          };
        }),
        pagination: {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

// ── PATCH /admin/users/:id/verify — toggle email verification ─────
router.patch('/users/:id/verify', requireCsrf, async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!userId || userId.length !== 24) {
      return res.status(400).json({ success: false, error: { message: 'Invalid user ID.' } });
    }
    const { verified } = req.body as { verified?: boolean };
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ success: false, error: { message: '`verified` must be a boolean.' } });
    }

    const User = (await import('../models/User.js')).default;
    const user = await User.findOneAndUpdate(
      { _id: userId, role: 'STUDENT' },
      { $set: { emailVerified: verified } },
      { returnDocument: 'after' },
    ).select('fullName email emailVerified');

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'Student not found.' } });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          emailVerified: user.emailVerified,
        },
        message: verified ? 'Email verified.' : 'Email verification revoked.',
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
