/**
 * Vitest global setup — runs once before any test file is imported.
 * Sets environment variables that must exist at module load time (e.g. SESSION_SECRET
 * is validated in env.ts when the module is first imported).
 */
export async function setup() {
  if (!process.env['SESSION_SECRET']) {
    // Use a fixed 32-char secret for tests — strong enough to pass validation
    process.env['SESSION_SECRET'] = 'test-session-secret-vitest-32chr';
  }
}
