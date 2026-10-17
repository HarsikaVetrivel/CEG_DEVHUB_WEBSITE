import Bookmark from '../models/Bookmark.js';
import Hackathon from '../models/Hackathon.js';
import ReminderDelivery from '../models/ReminderDelivery.js';

// ── Auto-archive expired hackathons ──────────────────────────────
//
// Finds every PUBLISHED hackathon whose registrationDeadline is in the
// past and transitions it to ARCHIVED.  Any PENDING reminder deliveries
// tied to those hackathons are cancelled at the same time so they never
// fire after the deadline has already passed.
//
export const archiveExpiredHackathons = async (): Promise<{
  archived: number;
  remindersCancelled: number;
}> => {
  const now = new Date();

  // Find expired-but-still-published hackathons
  const expired = await Hackathon.find({
    listingStatus: 'PUBLISHED',
    registrationDeadline: { $lt: now },
  })
    .select('_id')
    .lean();

  if (expired.length === 0) {
    return { archived: 0, remindersCancelled: 0 };
  }

  const expiredIds = expired.map((h) => h._id);

  // Archive them all in one shot
  await Hackathon.updateMany(
    { _id: { $in: expiredIds } },
    { $set: { listingStatus: 'ARCHIVED', lastUpdatedAt: now } },
  );

  // Cancel any still-pending reminders for these hackathons
  const cancelResult = await ReminderDelivery.updateMany(
    { hackathonId: { $in: expiredIds }, status: 'PENDING' },
    { $set: { status: 'CANCELLED' } },
  );

  console.log(
    `[cleanup] Archived ${expiredIds.length} expired hackathon(s); ` +
      `cancelled ${cancelResult.modifiedCount} pending reminder(s).`,
  );

  return {
    archived: expiredIds.length,
    remindersCancelled: cancelResult.modifiedCount,
  };
};

// ── Stale bookmark cleanup ────────────────────────────────────────
//
// Removes bookmarks whose linked hackathon is no longer PUBLISHED
// (e.g. it has been ARCHIVED, REJECTED, or hard-deleted).  This keeps
// each user's saved list clean and prevents orphaned ReminderDelivery
// rows from accumulating.
//
export const removeStaleBookmarks = async (): Promise<{
  removed: number;
}> => {
  // Collect the IDs of all currently-published hackathons
  const publishedIds = await Hackathon.find({ listingStatus: 'PUBLISHED' })
    .select('_id')
    .lean()
    .then((docs) => docs.map((d) => d._id));

  // Delete bookmarks that point to anything *not* in that set
  const result = await Bookmark.deleteMany({
    hackathonId: { $nin: publishedIds },
  });

  if (result.deletedCount > 0) {
    console.log(`[cleanup] Removed ${result.deletedCount} stale bookmark(s).`);
  }

  return { removed: result.deletedCount };
};

// ── Combined cleanup runner ───────────────────────────────────────
//
// Runs both cleanup steps in sequence.  Called by the scheduler.
//
export const runCleanup = async (): Promise<void> => {
  try {
    await archiveExpiredHackathons();
  } catch (error) {
    console.error('[cleanup] archiveExpiredHackathons failed:', error);
  }

  try {
    await removeStaleBookmarks();
  } catch (error) {
    console.error('[cleanup] removeStaleBookmarks failed:', error);
  }
};

let cleanupSchedulerRunning = false;

// ── Cleanup scheduler ─────────────────────────────────────────────
//
// Runs the full cleanup once immediately on startup, then every hour.
// Uses a simple in-process guard to prevent overlapping runs.
//
export const startCleanupScheduler = (): void => {
  const run = () => {
    if (cleanupSchedulerRunning) return;
    cleanupSchedulerRunning = true;
    runCleanup().finally(() => {
      cleanupSchedulerRunning = false;
    });
  };

  // Run immediately on startup
  run();

  // Then every hour
  const interval = setInterval(run, 60 * 60_000);
  interval.unref(); // Don't block process exit
};
