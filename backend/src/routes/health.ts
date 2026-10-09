import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

const healthQuerySchema = z.object({
  includeDb: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === 'string') {
        return value === 'true';
      }

      return value ?? false;
    }),
});

const router = Router();

router.get('/', (req, res) => {
  const parsed = healthQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid query parameters.',
        details: parsed.error.flatten(),
      },
    });
  }

  const includeDb = parsed.data.includeDb;
  const databaseStatus = includeDb
    ? {
        database: {
          state: mongoose.connection.readyState,
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        },
      }
    : {};

  return res.json({
    success: true,
    data: {
      service: 'CEG DEV HUB API',
      status: 'ok',
      environment: process.env.NODE_ENV ?? 'development',
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString(),
      ...databaseStatus,
    },
  });
});

export default router;
