import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from './helpers/db';
import { getCsrfToken, registerTestUser, loginTestUser } from './helpers/request';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

// ── Health ─────────────────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  it('returns 200 and status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect((res.body as { data: { status: string } }).data.status).toBe('ok');
  });
});

// ── CSRF ───────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/csrf', () => {
  it('returns a csrf token', async () => {
    const res = await request(app).get('/api/v1/auth/csrf');
    expect(res.status).toBe(200);
    expect(typeof (res.body as { data: { csrfToken: string } }).data?.csrfToken).toBe('string');
  });
});

// ── Registration ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('registers a new student with valid data', async () => {
    const { token, cookies } = await getCsrfToken();
    const res = await registerTestUser(cookies, token);
    expect(res.status).toBe(201);
    expect((res.body as { success: boolean }).success).toBe(true);
    expect((res.body as { data: { user: { email: string } } }).data.user.email)
      .toBe('test@student.annauniv.edu');
  });

  it('rejects a non-annauniv email', async () => {
    const { token, cookies } = await getCsrfToken();
    const res = await registerTestUser(cookies, token, { email: 'user@gmail.com' });
    expect(res.status).toBe(400);
  });

  it('rejects a weak password', async () => {
    const { token, cookies } = await getCsrfToken();
    const res = await registerTestUser(cookies, token, { password: 'password' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate email with 409', async () => {
    const { token: t1, cookies: c1 } = await getCsrfToken();
    await registerTestUser(c1, t1);
    const { token: t2, cookies: c2 } = await getCsrfToken();
    const res = await registerTestUser(c2, t2);
    expect(res.status).toBe(409);
  });

  it('rejects a request missing CSRF token with 403', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: 'X', email: 'x@student.annauniv.edu', password: 'Test@1234' });
    expect(res.status).toBe(403);
  });
});

// ── Login ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials and returns user', async () => {
    const { token: rt, cookies: rc } = await getCsrfToken();
    await registerTestUser(rc, rt);

    const { token: lt, cookies: lc } = await getCsrfToken();
    const res = await loginTestUser(lc, lt, 'test@student.annauniv.edu', 'Test@1234');
    expect(res.status).toBe(200);
    expect((res.body as { data: { user: { email: string } } }).data.user.email)
      .toBe('test@student.annauniv.edu');
  });

  it('rejects wrong password with 401', async () => {
    const { token: rt, cookies: rc } = await getCsrfToken();
    await registerTestUser(rc, rt);

    const { token: lt, cookies: lc } = await getCsrfToken();
    const res = await loginTestUser(lc, lt, 'test@student.annauniv.edu', 'WrongPass!1');
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const { token, cookies } = await getCsrfToken();
    const res = await loginTestUser(cookies, token, 'nobody@student.annauniv.edu', 'Test@1234');
    expect(res.status).toBe(401);
  });
});

// ── Profile (authenticated) ────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('returns profile when authenticated', async () => {
    const { token: rt, cookies: rc } = await getCsrfToken();
    await registerTestUser(rc, rt);
    const { token: lt, cookies: lc } = await getCsrfToken();
    const loginRes = await loginTestUser(lc, lt, 'test@student.annauniv.edu', 'Test@1234');
    const sessionCookies = loginRes.headers['set-cookie'] as string[];

    const res = await request(app).get('/api/v1/auth/me').set('Cookie', sessionCookies);
    expect(res.status).toBe(200);
    expect((res.body as { data: { user: { email: string } } }).data.user.email)
      .toBe('test@student.annauniv.edu');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── Logout ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('clears the session on logout', async () => {
    const { token: rt, cookies: rc } = await getCsrfToken();
    await registerTestUser(rc, rt);
    const { token: lt, cookies: lc } = await getCsrfToken();
    const loginRes = await loginTestUser(lc, lt, 'test@student.annauniv.edu', 'Test@1234');
    const sessionCookies = loginRes.headers['set-cookie'] as string[];

    const csrfRes = await request(app).get('/api/v1/auth/csrf').set('Cookie', sessionCookies);
    const csrfToken = (csrfRes.body as { data: { csrfToken: string } }).data?.csrfToken;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', sessionCookies)
      .set('X-CSRF-Token', csrfToken);
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', sessionCookies);
    expect(meRes.status).toBe(401);
  });
});
