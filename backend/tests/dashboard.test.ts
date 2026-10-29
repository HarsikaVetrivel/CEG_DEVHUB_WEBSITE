import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from './helpers/db';
import { getCsrfToken, registerTestUser, loginTestUser } from './helpers/request';
import { seedHackathon } from './helpers/hackathon';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function loginStudent(email = 'test@student.annauniv.edu') {
  const { token: rt, cookies: rc } = await getCsrfToken();
  await registerTestUser(rc, rt, { email });
  const { token: lt, cookies: lc } = await getCsrfToken();
  const loginRes = await loginTestUser(lc, lt, email, 'Test@1234');
  const sessionCookies = loginRes.headers['set-cookie'] as string[];
  const csrfRes = await request(app).get('/api/v1/auth/csrf').set('Cookie', sessionCookies);
  const csrfToken = (csrfRes.body as { data: { csrfToken: string } }).data?.csrfToken;
  return { sessionCookies, csrfToken };
}

// ── Dashboard ──────────────────────────────────────────────────────────────

describe('GET /api/v1/student/dashboard', () => {
  it('returns dashboard data for authenticated student', async () => {
    const { sessionCookies } = await loginStudent();
    const res = await request(app)
      .get('/api/v1/student/dashboard')
      .set('Cookie', sessionCookies);
    expect(res.status).toBe(200);
    expect((res.body as { success: boolean }).success).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/student/dashboard');
    expect(res.status).toBe(401);
  });
});

// ── Participations ─────────────────────────────────────────────────────────

describe('POST /api/v1/student/participations', () => {
  it('registers a participation in a published hackathon', async () => {
    const hackathon = await seedHackathon();
    const { sessionCookies, csrfToken } = await loginStudent();

    const res = await request(app)
      .post('/api/v1/student/participations')
      .set('Cookie', sessionCookies)
      .set('X-CSRF-Token', csrfToken)
      .send({ hackathonId: hackathon._id.toString() });
    expect(res.status).toBe(201);
    expect((res.body as { data: { participation: { status: string } } }).data.participation.status)
      .toBe('REGISTERED');
  });

  it('returns 409 on duplicate registration', async () => {
    const hackathon = await seedHackathon();
    const { sessionCookies, csrfToken } = await loginStudent();

    await request(app)
      .post('/api/v1/student/participations')
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken)
      .send({ hackathonId: hackathon._id.toString() });

    const res = await request(app)
      .post('/api/v1/student/participations')
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken)
      .send({ hackathonId: hackathon._id.toString() });
    expect(res.status).toBe(409);
  });

  it('returns 400 when registration deadline has passed', async () => {
    const hackathon = await seedHackathon({
      slug: 'expired-hack',
      name: 'Expired Hack',
      registrationDeadline: new Date('2000-01-01'),
      startDate: new Date('2000-01-02'),
      endDate: new Date('2000-01-03'),
    });
    const { sessionCookies, csrfToken } = await loginStudent();
    const res = await request(app)
      .post('/api/v1/student/participations')
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken)
      .send({ hackathonId: hackathon._id.toString() });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/student/participations/:id (withdraw + re-register)', () => {
  it('allows withdrawing and then re-registering before the deadline', async () => {
    const hackathon = await seedHackathon();
    const { sessionCookies, csrfToken } = await loginStudent();

    const regRes = await request(app)
      .post('/api/v1/student/participations')
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken)
      .send({ hackathonId: hackathon._id.toString() });
    const participationId = (regRes.body as { data: { participation: { _id: string } } })
      .data.participation._id;

    const wdRes = await request(app)
      .delete(`/api/v1/student/participations/${participationId}`)
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken);
    expect(wdRes.status).toBe(200);

    const reregRes = await request(app)
      .post('/api/v1/student/participations')
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken)
      .send({ hackathonId: hackathon._id.toString() });
    expect(reregRes.status).toBe(201);
    expect((reregRes.body as { data: { participation: { status: string } } })
      .data.participation.status).toBe('REGISTERED');
  });
});

// ── Bookmarks ──────────────────────────────────────────────────────────────

describe('POST /api/v1/student/bookmarks/:id', () => {
  it('adds a bookmark', async () => {
    const hackathon = await seedHackathon();
    const { sessionCookies, csrfToken } = await loginStudent();

    const res = await request(app)
      .post(`/api/v1/student/bookmarks/${hackathon._id.toString()}`)
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(201);
  });

  it('removes a bookmark', async () => {
    const hackathon = await seedHackathon();
    const { sessionCookies, csrfToken } = await loginStudent();

    await request(app)
      .post(`/api/v1/student/bookmarks/${hackathon._id.toString()}`)
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken);

    const delRes = await request(app)
      .delete(`/api/v1/student/bookmarks/${hackathon._id.toString()}`)
      .set('Cookie', sessionCookies).set('X-CSRF-Token', csrfToken);
    expect(delRes.status).toBe(200);
  });
});
