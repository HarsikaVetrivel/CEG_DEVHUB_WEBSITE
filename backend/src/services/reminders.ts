import ReminderDelivery from '../models/ReminderDelivery.js';
import Bookmark from '../models/Bookmark.js';
import Hackathon from '../models/Hackathon.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendReminderEmail } from './email.js';

const formatterFor = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

const getZonedParts = (date: Date, timeZone: string) => {
  const parts = formatterFor(timeZone).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const localWallTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
) => {
  const desiredUtc = Date.UTC(year, month - 1, day, hour);
  let guess = new Date(desiredUtc);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(guess, timeZone);
    const observedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    guess = new Date(guess.getTime() + desiredUtc - observedUtc);
  }

  return guess;
};

const scheduleForDeadline = (deadlineAt: Date, daysBefore: number, timeZone: string) => {
  const parts = getZonedParts(deadlineAt, timeZone);
  const deadlineLocalDate = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
  deadlineLocalDate.setUTCDate(deadlineLocalDate.getUTCDate() - daysBefore);
  return localWallTimeToUtc(
    deadlineLocalDate.getUTCFullYear(),
    deadlineLocalDate.getUTCMonth() + 1,
    deadlineLocalDate.getUTCDate(),
    9,
    timeZone,
  );
};

const reminderKey = (userId: string, hackathonId: string, deadlineAt: Date, daysBefore: number) =>
  `${userId}:${hackathonId}:${deadlineAt.toISOString()}:${daysBefore}`;

export const syncBookmarkReminders = async (userId: string, hackathonId: string) => {
  const [user, hackathon] = await Promise.all([
    User.findById(userId).select('reminderPreferences'),
    Hackathon.findOne({ _id: hackathonId, listingStatus: 'PUBLISHED' }).select(
      'registrationDeadline listingStatus name',
    ),
  ]);

  if (!user || !hackathon) {
    return;
  }

  const preferences = user.reminderPreferences;
  const now = new Date();
  const deadlineAt = hackathon.registrationDeadline;
  const schedules =
    preferences.enabled && deadlineAt > now
      ? preferences.daysBefore
          .map((daysBefore) => {
            const scheduledAt = scheduleForDeadline(deadlineAt, daysBefore, preferences.timeZone);
            return { daysBefore, scheduledAt };
          })
          .filter(({ scheduledAt }) => scheduledAt > now)
      : [];
  const dedupeKeys = schedules.map(({ daysBefore }) =>
    reminderKey(userId, hackathonId, deadlineAt, daysBefore),
  );

  await ReminderDelivery.updateMany(
    {
      userId,
      hackathonId,
      status: 'PENDING',
      ...(dedupeKeys.length ? { dedupeKey: { $nin: dedupeKeys } } : {}),
    },
    { $set: { status: 'CANCELLED' } },
  );

  if (schedules.length) {
    await ReminderDelivery.bulkWrite(
      schedules.map(({ daysBefore, scheduledAt }) => ({
        updateOne: {
          filter: { dedupeKey: reminderKey(userId, hackathonId, deadlineAt, daysBefore) },
          update: {
            $setOnInsert: {
              userId,
              hackathonId,
              daysBefore,
              deadlineAt,
              scheduledAt,
              dedupeKey: reminderKey(userId, hackathonId, deadlineAt, daysBefore),
              status: 'PENDING',
            },
          },
          upsert: true,
        },
      })),
    );
  }
};

export const syncAllUserReminders = async (userId: string) => {
  const bookmarks = await Bookmark.find({ userId }).select('hackathonId').lean();
  for (const bookmark of bookmarks) {
    await syncBookmarkReminders(userId, bookmark.hackathonId.toString());
  }
};

let schedulerRunning = false;

export const processDueReminders = async () => {
  if (schedulerRunning) return;
  schedulerRunning = true;

  try {
    const now = new Date();
    const due = await ReminderDelivery.find({
      scheduledAt: { $lte: now },
      $or: [
        { status: 'PENDING' },
        { status: 'PROCESSING', leaseUntil: { $lt: now } },
      ],
    })
      .sort({ scheduledAt: 1 })
      .limit(100)
      .select('_id userId hackathonId daysBefore deadlineAt dedupeKey attemptCount')
      .lean();

    for (const reminder of due) {
      const claimed = await ReminderDelivery.findOneAndUpdate(
        {
          _id: reminder._id,
          $or: [
            { status: 'PENDING' },
            { status: 'PROCESSING', leaseUntil: { $lt: now } },
          ],
        },
        {
          $set: { status: 'PROCESSING', leaseUntil: new Date(Date.now() + 60_000) },
          $inc: { attemptCount: 1 },
        },
        { returnDocument: 'after' },
      );
      if (!claimed) continue;

      try {
        const [user, hackathon, bookmark] = await Promise.all([
          User.findById(reminder.userId).select('reminderPreferences fullName email'),
          Hackathon.findOne({
            _id: reminder.hackathonId,
            listingStatus: 'PUBLISHED',
            registrationDeadline: reminder.deadlineAt,
          }).select('name registrationDeadline registrationUrl'),
          Bookmark.exists({ userId: reminder.userId, hackathonId: reminder.hackathonId }),
        ]);
        if (
          !user ||
          !hackathon ||
          !bookmark ||
          !user.reminderPreferences.enabled ||
          !user.reminderPreferences.daysBefore.includes(reminder.daysBefore)
        ) {
          await ReminderDelivery.updateOne(
            { _id: claimed._id, status: 'PROCESSING' },
            { $set: { status: 'CANCELLED' }, $unset: { leaseUntil: 1 } },
          );
          continue;
        }

        const notification = await Notification.findOneAndUpdate(
          { userId: reminder.userId, dedupeKey: reminder.dedupeKey },
          {
            $setOnInsert: {
              userId: reminder.userId,
              type: 'DEADLINE_REMINDER',
              title: 'Registration deadline coming up',
              body: `${hackathon.name} registration closes in ${reminder.daysBefore} ${reminder.daysBefore === 1 ? 'day' : 'days'}.`,
              hackathonId: reminder.hackathonId,
              dedupeKey: reminder.dedupeKey,
            },
          },
          { upsert: true, returnDocument: 'after' },
        );

        await ReminderDelivery.updateOne(
          { _id: claimed._id, status: 'PROCESSING' },
          {
            $set: { status: 'SENT', notificationId: notification._id },
            $unset: { leaseUntil: 1, lastError: 1 },
          },
        );

        // Send email reminder (non-blocking — email failure doesn't revert SENT status)
        if (user && hackathon) {
          void sendReminderEmail(
            (user as any).email as string,
            (user as any).fullName as string,
            hackathon.name,
            reminder.daysBefore,
            hackathon.registrationUrl ?? `${process.env['APP_URL'] ?? ''}/hackathons`,
          ).catch((emailErr: unknown) => {
            console.error('Reminder email delivery failed (notification was still created):', emailErr);
          });
        }
      } catch (error) {
        const attempts = reminder.attemptCount + 1;
        await ReminderDelivery.updateOne(
          { _id: claimed._id, status: 'PROCESSING' },
          {
            $set: {
              status: attempts >= 5 ? 'FAILED' : 'PENDING',
              lastError: error instanceof Error ? error.message.slice(0, 500) : 'Unknown reminder error',
              ...(attempts < 5 && {
                scheduledAt: new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 60_000)),
              }),
            },
            $unset: { leaseUntil: 1 },
          },
        );
        console.error('Reminder delivery attempt failed:', error);
      }
    }
  } finally {
    schedulerRunning = false;
  }
};

export const startReminderScheduler = () => {
  const interval = setInterval(() => {
    void processDueReminders().catch((error: unknown) => {
      console.error('Reminder scheduler failed:', error);
    });
  }, 60_000);
  interval.unref();
  void processDueReminders().catch((error: unknown) => {
    console.error('Initial reminder processing failed:', error);
  });
};

export const getReminderKey = reminderKey;
