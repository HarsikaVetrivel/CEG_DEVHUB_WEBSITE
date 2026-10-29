const getEnvList = (value?: string) =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const KNOWN_INSECURE_SECRETS = new Set([
  'development-session-secret-change-me',
  'changeme',
  'secret',
  'sessionsecret',
]);

const nodeEnvironment = process.env.NODE_ENV ?? 'development';
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error(
    'SESSION_SECRET environment variable is not set. ' +
    'Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
    'and set it in your .env file.',
  );
}

if (KNOWN_INSECURE_SECRETS.has(sessionSecret.toLowerCase().trim())) {
  throw new Error(
    'SESSION_SECRET is set to a known insecure value. ' +
    'Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  );
}

if (sessionSecret.length < 32) {
  throw new Error(
    `SESSION_SECRET must be at least 32 characters long (currently ${sessionSecret.length}).`,
  );
}

export const env = {
  NODE_ENV: nodeEnvironment,
  PORT: Number(process.env.PORT ?? 5000),
  CORS_ORIGIN: getEnvList(process.env.CORS_ORIGIN ?? 'http://localhost:5173'),
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ceg-dev-hub',
  SESSION_SECRET: sessionSecret,

  // ── App URL — used in email reset links ───────────────────────────
  APP_URL: process.env.APP_URL ?? 'http://localhost:5173',

  // ── SMTP (optional) — if unset, email falls back to console logging ──
  SMTP_HOST:   process.env.SMTP_HOST,
  SMTP_PORT:   Number(process.env.SMTP_PORT ?? 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER:   process.env.SMTP_USER,
  SMTP_PASS:   process.env.SMTP_PASS,
  SMTP_FROM:   process.env.SMTP_FROM ?? 'CEG DEV HUB <noreply@cegdevhub.local>',
};
