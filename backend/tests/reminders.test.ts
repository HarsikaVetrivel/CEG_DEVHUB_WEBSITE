import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from './helpers/db';
import { seedHackathon } from './helpers/hackathon';
import ReminderDelivery from '../src/models/ReminderDelivery';
import Bookmark from '../src/models/Bookmark';
import User from '../src/models/User';
import { syncBookmarkReminders } from '../src/services/reminders';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function createUserAndBookmark(userOverrides: Record<string, unknown> = {}) {
  const user = await User.create({
    fullName: 'Reminder User',
    email: 'reminder@student.annauniv.edu',
    passwordHash: 'x',
    role: 'STUDENT',
    isActive: true,
    reminderPreferences: {
      enabled: true,
      daysBefore: [3, 7],
      timeZone: 'Asia/Kolkata',
    },
    ...userOverrides,
  });

  const hackathon = await seedHackathon({
    slug: 'reminder-hack',
    name: 'Reminder Hack',
    registrationDeadline: new Date('2099-06-01'),
    startDate: new Date('2099-06-02'),
    endDate: new Date('2099-06-03'),
  });

  await Bookmark.create({ userId: user._id, hackathonId: hackathon._id });
  return { user, hackathon };
}

// ── syncBookmarkReminders ──────────────────────────────────────────────────

describe('syncBookmarkReminders', () => {
  it('creates PENDING reminder records for each daysBefore value', async () => {
    const { user, hackathon } = await createUserAndBookmark();
    await syncBookmarkReminders(user._id.toString(), hackathon._id.toString());

    const reminders = await ReminderDelivery.find({ userId: user._id }).lean();
    expect(reminders).toHaveLength(2);
    expect(reminders.map((r) => r.daysBefore).sort((a, b) => a - b)).toEqual([3, 7]);
    expect(reminders.every((r) => r.status === 'PENDING')).toBe(true);
  });

  it('is idempotent — calling twice creates no duplicates', async () => {
    const { user, hackathon } = await createUserAndBookmark();
    await syncBookmarkReminders(user._id.toString(), hackathon._id.toString());
    await syncBookmarkReminders(user._id.toString(), hackathon._id.toString());

    const reminders = await ReminderDelivery.find({ userId: user._id }).lean();
    expect(reminders).toHaveLength(2);
  });

  it('cancels existing reminders when preference is disabled', async () => {
    const { user, hackathon } = await createUserAndBookmark();
    await syncBookmarkReminders(user._id.toString(), hackathon._id.toString());

    await User.updateOne({ _id: user._id }, { $set: { 'reminderPreferences.enabled': false } });
    await syncBookmarkReminders(user._id.toString(), hackathon._id.toString());

    const pending = await ReminderDelivery.countDocuments({ userId: user._id, status: 'PENDING' });
    expect(pending).toBe(0);
    const cancelled = await ReminderDelivery.countDocuments({ userId: user._id, status: 'CANCELLED' });
    expect(cancelled).toBe(2);
  });

  it('creates no reminders for a past deadline', async () => {
    const { user } = await createUserAndBookmark();
    const pastHackathon = await seedHackathon({
      name: 'Past Hack', slug: 'past-hack',
      registrationDeadline: new Date('2000-01-01'),
      startDate: new Date('2000-01-02'),
      endDate: new Date('2000-01-03'),
    });
    await Bookmark.create({ userId: user._id, hackathonId: pastHackathon._id });

    await syncBookmarkReminders(user._id.toString(), pastHackathon._id.toString());
    const reminders = await ReminderDelivery.find({ hackathonId: pastHackathon._id }).lean();
    expect(reminders).toHaveLength(0);
  });
});
