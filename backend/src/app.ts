import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sessionMiddleware } from './middleware/session.js';

import authRouter from './routes/auth.js';
import hackathonsRouter from './routes/hackathons.js';
import healthRouter from './routes/health.js';
import studentRouter from './routes/student.js';
import adminRouter from './routes/admin.js';
import statsRouter from './routes/stats.js';

export const app = express();

// Trust the first hop from the reverse proxy (Nginx, Caddy, Railway, Render, etc.)
// This makes req.ip reflect the real client IP (from X-Forwarded-For) so that
// rate limiting and secure cookies work correctly in production.
// Only enable in production to avoid trusting spoofed headers in local dev.
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const allowedOrigins = env.CORS_ORIGIN.length > 0 ? env.CORS_ORIGIN : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message: 'Too many requests. Please slow down and try again later.',
      },
    },
  }),
);

// Stricter limit for auth endpoints (login + register) to prevent brute-force / mass sign-up
const authRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20,                  // 20 attempts per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET', // CSRF token fetch is a GET — skip it
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again in an hour.',
    },
  },
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use((req, _res, next) => {
  if (req.session && req.session.user) {
    req.user = {
      id: req.session.user.id,
      email: req.session.user.email,
      role: req.session.user.role,
    };
  }

  next();
});

app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'CEG DEV HUB API',
      version: 'v1',
      status: 'operational',
    },
  });
});

app.use('/api/v1/auth', authRateLimit, authRouter);
app.use('/api/v1/hackathons', hackathonsRouter);
app.use('/api/v1/student', studentRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/health', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
