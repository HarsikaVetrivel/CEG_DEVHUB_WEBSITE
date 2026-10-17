import mongoose from 'mongoose';

import Bookmark from '../models/Bookmark.js';
import Hackathon from '../models/Hackathon.js';
import Notification from '../models/Notification.js';
import ReminderDelivery from '../models/ReminderDelivery.js';
import User from '../models/User.js';
import { getReminderKey, syncAllUserReminders, syncBookmarkReminders } from './reminders.js';

/**
 * Creates a bookmark linking a user to a published hackathon.
 * Idempotent — re-bookmarking the same hackathon is a no-op.
 * Triggers reminder sync for the new bookmark.
 */
export const createBookmark = async (userId: string, hackathonId: string) => {
  const hackathon = await Hackathon.findOne({
    _id: hackathonId,
    listingStatus: 'PUBLISHED',
  }).select('_id');
  if (!hackathon) return null;

  // upsert: true + $setOnInsert ensures we don't overwrite an existing bookmark.
  // createdAt is managed automatically by Mongoose timestamps: true.
  await Bookmark.updateOne(
    { userId, hackathonId },
    { $setOnInsert: { userId, hackathonId } },
    { upsert: true },
  );
  await syncBookmarkReminders(userId, hackathonId);
  return { bookmarked: true };
};

/**
 * Removes a bookmark and cancels any pending reminder deliveries
 * so they never fire after the user stops tracking this hackathon.
 */
export const removeBookmark = async (userId: string, hackathonId: string) => {
  const result = await Bookmark.deleteOne({ userId, hackathonId });
  await ReminderDelivery.updateMany(
    { userId, hackathonId, status: 'PENDING' },
    { $set: { status: 'CANCELLED' } },
  );
  return { bookmarked: false, removed: result.deletedCount > 0 };
};

/**
 * Returns a paginated list of the user's bookmarked PUBLISHED hackathons,
 * sorted by upcoming registration deadline.
 */
export const getBookmarks = async (userId: string, page: number, limit: number) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [result] = await Bookmark.aggregate([
    { $match: { userId: objectUserId } },
    {
      $lookup: {
        from: 'hackathons',
        localField: 'hackathonId',
        foreignField: '_id',
        as: 'hackathon',
      },
    },
    { $unwind: '$hackathon' },
    { $match: { 'hackathon.listingStatus': 'PUBLISHED' } },
    { $sort: { 'hackathon.registrationDeadline': 1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              createdAt: 1,
              hackathon: {
                _id: '$hackathon._id',
                name: '$hackathon.name',
                slug: '$hackathon.slug',
                organizer: '$hackathon.organizer',
                description: '$hackathon.description',
                registrationUrl: '$hackathon.registrationUrl',
                startDate: '$hackathon.startDate',
                endDate: '$hackathon.endDate',
                registrationDeadline: '$hackathon.registrationDeadline',
                location: '$hackathon.location',
                mode: '$hackathon.mode',
                domains: '$hackathon.domains',
                lifecycleStatus: '$hackathon.lifecycleStatus',
                verificationStatus: '$hackathon.verificationStatus',
              },
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ]);

  const total = result?.metadata[0]?.total ?? 0;
  return {
    items: result?.items ?? [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Assembles all dashboard data for a student in a single compound query:
 * - profile fields
 * - bookmark count + unread notification count
 * - the 5 soonest upcoming bookmarked deadlines
 * - the 5 most recent notifications
 */
export const getDashboardData = async (userId: string) => {
  const user = await User.findById(userId).select(
    'fullName email reminderPreferences emailVerified yearOfStudy course interestedDomains',
  );
  if (!user) return null;

  const now = new Date();
  const [bookmarkCount, unreadCount, upcomingBookmarks, notifications] = await Promise.all([
    Bookmark.countDocuments({ userId }),
    Notification.countDocuments({ userId, readAt: { $exists: false } }),
    Bookmark.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'hackathons',
          localField: 'hackathonId',
          foreignField: '_id',
          as: 'hackathon',
        },
      },
      { $unwind: '$hackathon' },
      {
        $match: {
          'hackathon.listingStatus': 'PUBLISHED',
          'hackathon.registrationDeadline': { $gt: now },
        },
      },
      { $sort: { 'hackathon.registrationDeadline': 1, _id: 1 } },
      { $limit: 5 },
      {
        $replaceRoot: {
          newRoot: {
            _id: '$hackathon._id',
            name: '$hackathon.name',
            slug: '$hackathon.slug',
            organizer: '$hackathon.organizer',
            registrationDeadline: '$hackathon.registrationDeadline',
            startDate: '$hackathon.startDate',
            mode: '$hackathon.mode',
            domains: '$hackathon.domains',
            lifecycleStatus: '$hackathon.lifecycleStatus',
          },
        },
      },
    ]),
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type title message hackathonId readAt createdAt')
      .populate({ path: 'hackathonId', select: 'name slug' })
      .lean(),
  ]);

  return {
    profile: {
      fullName: user.fullName,
      email: user.email,
      emailVerified: user.emailVerified,
      yearOfStudy: user.yearOfStudy ?? null,
      course: user.course ?? null,
      interestedDomains: user.interestedDomains ?? [],
    },
    summary: {
      bookmarks: bookmarkCount,
      unreadNotifications: unreadCount,
    },
    reminderPreferences: user.reminderPreferences,
    upcomingBookmarkedDeadlines: upcomingBookmarks,
    notifications,
  };
};

/** Returns a paginated list of all notifications for a user, newest first. */
export const getNotifications = async (userId: string, page: number, limit: number) => {
  const [items, total] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('type title message hackathonId readAt createdAt')
      .populate({ path: 'hackathonId', select: 'name slug' })
      .lean(),
    Notification.countDocuments({ userId }),
  ]);
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

/** Marks a single notification as read. Returns null if not found / unauthorised. */
export const markNotificationRead = async (userId: string, notificationId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { readAt: new Date() } },
    { returnDocument: 'after' },
  ).select('_id readAt');
  return notification;
};

/**
 * Persists updated reminder preferences and triggers a full reminder
 * re-sync so scheduled deliveries reflect the new settings immediately.
 */
export const updateReminderPreferences = async (
  userId: string,
  preferences: { enabled: boolean; daysBefore: number[]; timeZone: string },
) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { reminderPreferences: preferences } },
    { returnDocument: 'after', runValidators: true },
  ).select('reminderPreferences');
  if (user) await syncAllUserReminders(userId);
  return user?.reminderPreferences ?? null;
};

/**
 * Returns the bookmark state and active reminder delivery records for a
 * specific hackathon, as seen by a specific student.
 * Used by the BookmarkButton component to initialise its state.
 */
export const getStudentListingState = async (userId: string, hackathonId: string) => {
  const [bookmarked, hackathon, user] = await Promise.all([
    Bookmark.exists({ userId, hackathonId }),
    Hackathon.findOne({ _id: hackathonId, listingStatus: 'PUBLISHED' }).select(
      '_id registrationDeadline',
    ),
    User.findById(userId).select('reminderPreferences'),
  ]);
  if (!hackathon || !user) return null;

  const activeReminders =
    user.reminderPreferences.enabled && hackathon.registrationDeadline > new Date()
      ? user.reminderPreferences.daysBefore.map((daysBefore) => ({
          daysBefore,
          dedupeKey: getReminderKey(
            userId,
            hackathonId,
            hackathon.registrationDeadline,
            daysBefore,
          ),
        }))
      : [];
  const reminderRecords = await ReminderDelivery.find({
    dedupeKey: { $in: activeReminders.map((reminder) => reminder.dedupeKey) },
    status: { $in: ['PENDING', 'PROCESSING', 'SENT'] },
  }).select('daysBefore status scheduledAt');
  return {
    bookmarked: Boolean(bookmarked),
    reminders: reminderRecords,
  };
};
