const getEnvList = (value?: string) =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const nodeEnvironment = process.env.NODE_ENV ?? 'development';
const sessionSecret = process.env.SESSION_SECRET ?? 'development-session-secret-change-me';

if (nodeEnvironment === 'production' && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production.');
}

export const env = {
  NODE_ENV: nodeEnvironment,
  PORT: Number(process.env.PORT ?? 5000),
  CORS_ORIGIN: getEnvList(process.env.CORS_ORIGIN ?? 'http://localhost:5173'),
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ceg-dev-hub',
  SESSION_SECRET: sessionSecret,
};
