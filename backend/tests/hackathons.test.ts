import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { connectTestDb, clearTestDb, disconnectTestDb } from './helpers/db';
import { seedHackathon } from './helpers/hackathon';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

// ── Public listing (no auth required) ─────────────────────────────────────

describe('GET /api/v1/hackathons', () => {
  it('returns empty list when no hackathons exist', async () => {
    const res = await request(app).get('/api/v1/hackathons');
    expect(res.status).toBe(200);
    expect((res.body as { data: { items: unknown[] } }).data.items).toHaveLength(0);
  });

  it('returns published hackathons', async () => {
    await seedHackathon();
    const res = await request(app).get('/api/v1/hackathons');
    expect(res.status).toBe(200);
    expect((res.body as { data: { items: unknown[] } }).data.items).toHaveLength(1);
  });

  it('does not return PENDING hackathons', async () => {
    await seedHackathon({ listingStatus: 'PENDING', slug: 'pending-hack', name: 'Pending Hack' });
    const res = await request(app).get('/api/v1/hackathons');
    expect(res.status).toBe(200);
    expect((res.body as { data: { items: unknown[] } }).data.items).toHaveLength(0);
  });

  it('is accessible without authentication (public route)', async () => {
    const res = await request(app).get('/api/v1/hackathons');
    expect(res.status).toBe(200);
  });
});

// ── Detail page ────────────────────────────────────────────────────────────

describe('GET /api/v1/hackathons/:slug', () => {
  it('returns hackathon detail by slug', async () => {
    await seedHackathon();
    const res = await request(app).get('/api/v1/hackathons/test-hackathon');
    expect(res.status).toBe(200);
    expect((res.body as { data: { hackathon: { slug: string } } }).data.hackathon.slug)
      .toBe('test-hackathon');
  });

  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get('/api/v1/hackathons/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-published hackathon', async () => {
    await seedHackathon({ listingStatus: 'PENDING', slug: 'pending-hack', name: 'Pending Hack' });
    const res = await request(app).get('/api/v1/hackathons/pending-hack');
    expect(res.status).toBe(404);
  });
});

// ── Search using ?q= param ─────────────────────────────────────────────────

describe('GET /api/v1/hackathons?q=', () => {
  it('finds a hackathon by name substring', async () => {
    await seedHackathon({ name: 'AI Hackathon', slug: 'ai-hackathon' });
    await seedHackathon({ name: 'Web Hackathon', slug: 'web-hackathon' });
    const res = await request(app).get('/api/v1/hackathons?q=AI');
    expect(res.status).toBe(200);
    const items = (res.body as { data: { items: { name: string }[] } }).data.items;
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('AI Hackathon');
  });

  it('returns all published hackathons when no query given', async () => {
    await seedHackathon({ name: 'Hack One', slug: 'hack-one' });
    await seedHackathon({ name: 'Hack Two', slug: 'hack-two' });
    const res = await request(app).get('/api/v1/hackathons');
    expect(res.status).toBe(200);
    expect((res.body as { data: { items: unknown[] } }).data.items).toHaveLength(2);
  });
});
