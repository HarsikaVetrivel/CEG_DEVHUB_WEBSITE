import { Router } from 'express';

import { getPublishedHackathonBySlug, listPublishedHackathons } from '../services/hackathons.js';
import { createError } from '../utils/errors.js';
import { hackathonListQuerySchema, hackathonSlugSchema } from '../validators/hackathons.js';

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

export default router;
