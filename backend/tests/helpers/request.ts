import request from 'supertest';
import { app } from '../../src/app';

/**
 * Fetch a CSRF token from the running app (needed for all mutating requests).
 * Returns the token string and the Set-Cookie header for session continuity.
 */
export async function getCsrfToken(): Promise<{ token: string; cookies: string[] }> {
  const res = await request(app).get('/api/v1/auth/csrf');
  const cookies = (res.headers['set-cookie'] as string[] | string | undefined) ?? [];
  const cookieArr = Array.isArray(cookies) ? cookies : (cookies ? [cookies] : []);
  const token: string = (res.body as { data: { csrfToken: string } }).data?.csrfToken ?? '';
  return { token, cookies: cookieArr };
}

/**
 * Register a user and return the response. Handles CSRF automatically.
 */
export async function registerTestUser(
  cookies: string[],
  csrfToken: string,
  overrides: Partial<{ fullName: string; email: string; password: string }> = {},
) {
  const payload = {
    fullName: overrides.fullName ?? 'Test User',
    email: overrides.email ?? 'test@student.annauniv.edu',
    password: overrides.password ?? 'Test@1234',
    confirmPassword: overrides.password ?? 'Test@1234',
  };
  return request(app)
    .post('/api/v1/auth/register')
    .set('Cookie', cookies)
    .set('X-CSRF-Token', csrfToken)
    .send(payload);
}

/**
 * Login a user and return the agent response + session cookies.
 */
export async function loginTestUser(
  cookies: string[],
  csrfToken: string,
  email: string,
  password: string,
) {
  return request(app)
    .post('/api/v1/auth/login')
    .set('Cookie', cookies)
    .set('X-CSRF-Token', csrfToken)
    .send({ email, password });
}

