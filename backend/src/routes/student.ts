import { Router } from 'express';

import Bookmark from '../models/Bookmark.js';
import Hackathon from '../models/Hackathon.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { syncBookmarkReminders } from '../services/reminders.js';
import {
  createBookmark,
  getBookmarks,
  getDashboardData,
  getNotifications,
  getStudentListingState,
  markNotificationRead,
  removeBookmark,
  updateReminderPreferences,
} from '../services/student.js';
import { createError } from '../utils/errors.js';
import {
  objectIdParamsSchema,
  paginationQuerySchema,
  reminderPreferencesSchema,
} from '../validators/student.js';
const router = Router();

router.use(requireAuth, requireRole(['STUDENT']));

router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await getDashboardData(req.user!.id);
    if (!data) throw createError(404, 'Student account not found.');
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.get('/bookmarks', async (req, res, next) => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid pagination.', details: parsed.error.flatten() },
    });
  }
  try {
    const result = await getBookmarks(req.user!.id, parsed.data.page, parsed.data.limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.post('/bookmarks/:id', requireCsrf, async (req, res, next) => {
  const parsed = objectIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid hackathon ID.', details: parsed.error.flatten() },
    });
  }
  try {
    const result = await createBookmark(req.user!.id, parsed.data.id);
    if (!result) throw createError(404, 'Published hackathon not found.');
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.delete('/bookmarks/:id', requireCsrf, async (req, res, next) => {
  const parsed = objectIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid hackathon ID.', details: parsed.error.flatten() },
    });
  }
  try {
    const result = await removeBookmark(req.user!.id, parsed.data.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.get('/bookmarks/:id/state', async (req, res, next) => {
  const parsed = objectIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid hackathon ID.', details: parsed.error.flatten() },
    });
  }
  try {
    const result = await getStudentListingState(req.user!.id, parsed.data.id);
    if (!result) throw createError(404, 'Published hackathon not found.');
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.get('/notifications', async (req, res, next) => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid pagination.', details: parsed.error.flatten() },
    });
  }
  try {
    const result = await getNotifications(req.user!.id, parsed.data.page, parsed.data.limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

router.patch('/notifications/:id/read', requireCsrf, async (req, res, next) => {
  const parsed = objectIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid notification ID.', details: parsed.error.flatten() },
    });
  }
  try {
    const notification = await markNotificationRead(req.user!.id, parsed.data.id);
    if (!notification) throw createError(404, 'Notification not found.');
    return res.json({ success: true, data: { notification } });
  } catch (error) {
    return next(error);
  }
});

router.put('/reminder-preferences', requireCsrf, async (req, res, next) => {
  const parsed = reminderPreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid reminder preferences.', details: parsed.error.flatten() },
    });
  }
  try {
    const preferences = await updateReminderPreferences(req.user!.id, parsed.data);
    if (!preferences) throw createError(404, 'Student account not found.');
    return res.json({ success: true, data: { reminderPreferences: preferences } });
  } catch (error) {
    return next(error);
  }
});

router.post('/bookmarks/:id/reminders/sync', requireCsrf, async (req, res, next) => {
  const parsed = objectIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid hackathon ID.', details: parsed.error.flatten() },
    });
  }
  try {
    const bookmark = await Bookmark.exists({
      userId: req.user!.id,
      hackathonId: parsed.data.id,
    });
    const listing = await Hackathon.exists({
      _id: parsed.data.id,
      listingStatus: 'PUBLISHED',
    });
    if (!bookmark || !listing) throw createError(404, 'Bookmarked hackathon not found.');
    await syncBookmarkReminders(req.user!.id, parsed.data.id);
    return res.json({ success: true, data: { synchronized: true } });
  } catch (error) {
    return next(error);
  }
});

router.get('/reminder-preferences', async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.id).select('reminderPreferences');
    if (!user) throw createError(404, 'Student account not found.');
    return res.json({ success: true, data: { reminderPreferences: user.reminderPreferences } });
  } catch (error) {
    return next(error);
  }
});

export default router;
