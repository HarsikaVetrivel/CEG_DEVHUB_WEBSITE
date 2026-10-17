import { Router } from 'express';

import { getPublishedHackathonBySlug, listPublishedHackathons } from '../services/hackathons.js';
import { getLeaderboard, getHackathonParticipants } from '../services/participation.js';
import { browseTeamRequests } from '../services/teammate.js';
import { createError } from '../utils/errors.js';
import { hackathonListQuerySchema, hackathonSlugSchema } from '../validators/hackathons.js';
import { rankingsQuerySchema } from '../validators/participation.js';
import { teammateDiscoveryQuerySchema } from '../validators/teammate.js';
import { paginationQuerySchema } from '../validators/student.js';

const router = Router();

router.get('/', async (req, res, next) => {
  const parsed = hackathonListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid hackathon filters.',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const result = await listPublishedHackathons(parsed.data);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

// ── Public leaderboard (must be BEFORE /:slug to avoid being shadowed) ────

router.get('/rankings/leaderboard', async (req, res, next) => {
  const parsed = rankingsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid query params.' } });
  }
  try {
    const result = await getLeaderboard(
      parsed.data.sort,
      parsed.data.domain,
      parsed.data.page,
      parsed.data.limit,
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

// ── Hackathon details by slug ────────────────────────────────────────────

router.get('/:slug', async (req, res, next) => {
  const parsed = hackathonSlugSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid hackathon slug.',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const hackathon = await getPublishedHackathonBySlug(parsed.data.slug);
    if (!hackathon) {
      throw createError(404, 'Hackathon not found.');
    }

    return res.json({ success: true, data: { hackathon } });
  } catch (error) {
    return next(error);
  }
});


// ── Participants for a specific hackathon (by slug) ───────────────────

router.get('/:slug/participants', async (req, res, next) => {
  const slugParsed = hackathonSlugSchema.safeParse(req.params);
  const paginationParsed = paginationQuerySchema.safeParse(req.query);
  if (!slugParsed.success || !paginationParsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid request.' } });
  }
  try {
    const hackathon = await getPublishedHackathonBySlug(slugParsed.data.slug);
    if (!hackathon) throw createError(404, 'Hackathon not found.');
    const result = await getHackathonParticipants(
      (hackathon._id as any).toString(),
      paginationParsed.data.page,
      paginationParsed.data.limit,
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

// ── Open team requests for a specific hackathon (by slug) ───────────

router.get('/:slug/team-requests', async (req, res, next) => {
  const slugParsed = hackathonSlugSchema.safeParse(req.params);
  const queryParsed = teammateDiscoveryQuerySchema.safeParse(req.query);
  if (!slugParsed.success || !queryParsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid request.' } });
  }
  try {
    const hackathon = await getPublishedHackathonBySlug(slugParsed.data.slug);
    if (!hackathon) throw createError(404, 'Hackathon not found.');
    const result = await browseTeamRequests(
      { hackathonId: (hackathon._id as any).toString(), skill: queryParsed.data.skill },
      queryParsed.data.page,
      queryParsed.data.limit,
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

export default router;
