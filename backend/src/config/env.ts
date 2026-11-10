
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

  CORS_ORIGIN: getEnvList(
    process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  ),

  MONGODB_URI:
    process.env.MONGODB_URI ??
    'mongodb://127.0.0.1:27017/ceg-dev-hub',

  SESSION_SECRET: sessionSecret,

  // ── App URL — used in email reset links ─────────────────────
  APP_URL: process.env.APP_URL ?? 'http://localhost:5173',

  // ── Brevo Email API configuration ──────────────────────────
  BREVO_API_KEY: process.env.BREVO_API_KEY ?? '',

  EMAIL_FROM: process.env.EMAIL_FROM ?? '',

  // ── Google Sheets sync configuration ───────────────────────
  // Set GOOGLE_SHEET_ID to the spreadsheet ID and
  // GOOGLE_SERVICE_ACCOUNT_KEY_JSON to the full service-account key JSON.
  // Leave blank to disable the sheet sync job.
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ?? '',

  GOOGLE_SERVICE_ACCOUNT_KEY_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON ?? '',

  // How often to poll the sheet (default: 5 minutes)
  SHEET_SYNC_INTERVAL_MS: Number(process.env.SHEET_SYNC_INTERVAL_MS ?? 5 * 60_000),
};

// ── Warn about missing email config at startup (dev only) ───────────
if (nodeEnvironment !== 'test') {
  if (!process.env.BREVO_API_KEY) {
    console.warn(
      '[Config Warning] BREVO_API_KEY is not set — password-reset and reminder emails will fail. ' +
      'Add it to your .env file (see .env.example).',
    );
  }
  if (!process.env.EMAIL_FROM) {
    console.warn(
      '[Config Warning] EMAIL_FROM is not set — password-reset and reminder emails will fail. ' +
      'Add it to your .env file (see .env.example).',
    );
  }
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    console.warn(
      '[Config Warning] GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not set — ' +
      'Google Sheet hackathon sync is disabled.',
    );
  }
}
