import session from 'express-session';
import MongoStore from 'connect-mongo';

import { env } from '../config/env.js';

export const sessionMiddleware = session({
  secret: env.SESSION_SECRET,
  store: MongoStore.create({
    mongoUrl: env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 8,
    autoRemove: 'native',
  }),
  resave: false,
  saveUninitialized: false,
  name: 'ceg_dev_hub_sid',
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8,
  },
});
