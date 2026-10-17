import 'dotenv/config';

import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import app from './app.js';
import { startReminderScheduler } from './services/reminders.js';
import { startCleanupScheduler } from './services/cleanup.js';

const startServer = async () => {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
    startReminderScheduler();
    startCleanupScheduler();
  });
};

startServer().catch((error) => {
  console.error('Unable to start server:', error);
  process.exit(1);
});

export default app;
