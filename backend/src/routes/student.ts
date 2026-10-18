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
import {
  createParticipation,
  updateParticipation,
  getMyParticipations,
  getParticipationById,
  withdrawParticipation,
  getMyAchievements,
} from '../services/participation.js';
import {
  createTeamRequest,
  updateTeamRequest,
  deleteTeamRequest,
  getMyTeamRequests,
  browseTeamRequests,
  applyToTeam,
  getIncomingApplications,
  respondToApplication,
  withdrawApplication,
  getMyApplications,
} from '../services/teammate.js';
import { createError } from '../utils/errors.js';
import {
  objectIdParamsSchema,
  paginationQuerySchema,
  reminderPreferencesSchema,
} from '../validators/student.js';
import {
  createParticipationSchema,
  updateParticipationSchema,
  rankingsQuerySchema,
} from '../validators/participation.js';
import {
  createTeamRequestSchema,
  updateTeamRequestSchema,
  applyToTeamSchema,
  respondToApplicationSchema,
  teammateDiscoveryQuerySchema,
} from '../validators/teammate.js';

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

// ── Participation Routes ─────────────────────────────────────────────────────

router.post('/participations', requireCsrf, async (req, res, next) => {
  const parsed = createParticipationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Validation failed.', details: parsed.error.flatten() } });
  try {
    const participation = await createParticipation(req.user!.id, parsed.data.hackathonId, parsed.data.teamName);
    return res.status(201).json({ success: true, data: { participation } });
  } catch (error) { return next(error); }
});

router.get('/participations', async (req, res, next) => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination.' } });
  try {
    const result = await getMyParticipations(req.user!.id, parsed.data.page, parsed.data.limit);
    return res.json({ success: true, data: result });
  } catch (error) { return next(error); }
});

router.get('/participations/:id', async (req, res, next) => {
  try {
    const participation = await getParticipationById(req.user!.id, req.params.id);
    return res.json({ success: true, data: { participation } });
  } catch (error) { return next(error); }
});

router.patch('/participations/:id', requireCsrf, async (req, res, next) => {
  const parsed = updateParticipationSchema.safeParse(req.body);
  if (!parsed.success) {
    // Extract the first meaningful refine message so the UI shows
    // e.g. "A proof URL is required…" instead of generic "Validation failed."
    const flat = parsed.error.flatten();
    const firstFormError = flat.formErrors[0];
    const firstFieldError = Object.values(flat.fieldErrors).flat()[0];
    const humanMessage = firstFormError ?? firstFieldError ?? 'Validation failed.';
    return res.status(400).json({ success: false, error: { message: humanMessage, details: flat } });
  }
  try {
    const participation = await updateParticipation(req.user!.id, req.params.id as string, parsed.data);
    return res.json({ success: true, data: { participation } });
  } catch (error) { return next(error); }
});

router.delete('/participations/:id', requireCsrf, async (req, res, next) => {
  try {
    const result = await withdrawParticipation(req.user!.id, req.params.id as string);
    return res.json({ success: true, data: result });
  } catch (error) { return next(error); }
});

router.get('/achievements', async (req, res, next) => {
  try {
    const achievements = await getMyAchievements(req.user!.id);
    return res.json({ success: true, data: { achievements } });
  } catch (error) { return next(error); }
});

// ── Teammate Routes ───────────────────────────────────────────────────────────

router.post('/team-requests', requireCsrf, async (req, res, next) => {
  const parsed = createTeamRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Validation failed.', details: parsed.error.flatten() } });
  try {
    const request = await createTeamRequest(req.user!.id, parsed.data);
    return res.status(201).json({ success: true, data: { request } });
  } catch (error) { return next(error); }
});

router.get('/team-requests', async (req, res, next) => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination.' } });
  try {
    const result = await getMyTeamRequests(req.user!.id, parsed.data.page, parsed.data.limit);
    return res.json({ success: true, data: result });
  } catch (error) { return next(error); }
});

router.patch('/team-requests/:id', requireCsrf, async (req, res, next) => {
  const parsed = updateTeamRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Validation failed.', details: parsed.error.flatten() } });
  try {
    const request = await updateTeamRequest(req.user!.id, req.params.id as string, parsed.data);
    return res.json({ success: true, data: { request } });
  } catch (error) { return next(error); }
});

router.delete('/team-requests/:id', requireCsrf, async (req, res, next) => {
  try {
    const result = await deleteTeamRequest(req.user!.id, req.params.id as string);
    return res.json({ success: true, data: result });
  } catch (error) { return next(error); }
});

router.post('/team-requests/:id/apply', requireCsrf, async (req, res, next) => {
  const parsed = applyToTeamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Validation failed.', details: parsed.error.flatten() } });
  try {
    const application = await applyToTeam(req.user!.id, req.params.id as string, parsed.data.message);
    return res.status(201).json({ success: true, data: { application } });
  } catch (error) { return next(error); }
});

router.get('/team-requests/:id/applications', async (req, res, next) => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination.' } });
  try {
    const result = await getIncomingApplications(req.user!.id, req.params.id as string, parsed.data.page, parsed.data.limit);
    return res.json({ success: true, data: result });
  } catch (error) { return next(error); }
});

router.patch('/team-applications/:id', requireCsrf, async (req, res, next) => {
  const parsed = respondToApplicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Validation failed.', details: parsed.error.flatten() } });
  const status = parsed.data.status as 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  try {
    if (status === 'WITHDRAWN') {
      const result = await withdrawApplication(req.user!.id, req.params.id as string);
      return res.json({ success: true, data: { application: result } });
    }
    const result = await respondToApplication(req.user!.id, req.params.id as string, status);
    return res.json({ success: true, data: { application: result } });
  } catch (error) { return next(error); }
});

router.get('/team-applications', async (req, res, next) => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination.' } });
  try {
    const result = await getMyApplications(req.user!.id, parsed.data.page, parsed.data.limit);
    return res.json({ success: true, data: result });
  } catch (error) { return next(error); }
});

router.get('/teammate-discovery', async (req, res, next) => {
  const parsed = teammateDiscoveryQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid filters.' } });
  try {
    const result = await browseTeamRequests(
      { hackathonId: parsed.data.hackathonId, skill: parsed.data.skill },
      parsed.data.page,
      parsed.data.limit,
    );
    return res.json({ success: true, data: result });
  } catch (error) { return next(error); }
});

export default router;
