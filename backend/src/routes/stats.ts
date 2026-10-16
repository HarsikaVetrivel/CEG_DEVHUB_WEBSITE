import { Router } from 'express';
import Hackathon from '../models/Hackathon.js';
import User from '../models/User.js';

const router = Router();

/**
 * GET /api/v1/stats
 * Returns public platform statistics for the landing page.
 * No authentication required.
 */
router.get('/', async (_req, res, next) => {
  try {
    const [hackathonCount, studentCount] = await Promise.all([
      Hackathon.countDocuments({ listingStatus: 'PUBLISHED' }),
      User.countDocuments({ role: 'STUDENT', isActive: true }),
    ]);

    return res.json({
      success: true,
      data: {
        publishedHackathons: hackathonCount,
        registeredStudents: studentCount,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
