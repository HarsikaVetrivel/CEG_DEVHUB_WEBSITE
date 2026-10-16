import mongoose from 'mongoose';
import Hackathon, {
  HACKATHON_DOMAINS,
  HACKATHON_LIFECYCLE_STATUSES,
  HACKATHON_LISTING_STATUSES,
  HACKATHON_MODES,
  HACKATHON_SOURCE_TYPES,
  type HackathonDomain,
  type HackathonLifecycleStatus,
  type HackathonListingStatus,
  type HackathonMode,
} from '../models/Hackathon.js';
import { createError } from '../utils/errors.js';

// ── Types ─────────────────────────────────────────────────────────
export type AdminHackathonPayload = {
  name: string;
  organizer: string;
  description: string;
  registrationUrl: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: string;
  mode: HackathonMode;
  domains: HackathonDomain[];
  eligibility: string;
  minimumTeamSize: number;
  maximumTeamSize: number;
  prizeDetails: string;
  requiredSkills: string[];
  lifecycleStatus: HackathonLifecycleStatus;
  listingStatus: HackathonListingStatus;
  sourceType: string;
  sourceUrl?: string;
};

// Generate a URL-safe slug from name + date
const slugify = (name: string, date: string): string => {
  const dateStr = new Date(date).toISOString().slice(0, 10).replace(/-/g, '');
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${dateStr}`;
};

// Ensure slug uniqueness
const uniqueSlug = async (base: string, excludeId?: string): Promise<string> => {
  let candidate = base;
  let counter = 0;
  while (true) {
    const query: mongoose.QueryFilter<unknown> = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Hackathon.exists(query);
    if (!exists) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
};

// ── List all (admin sees every listing status) ────────────────────
export const adminListHackathons = async (page = 1, limit = 20, q?: string, listingStatus?: string) => {
  const filter: mongoose.QueryFilter<unknown> = {};
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: pattern }, { organizer: pattern }];
  }
  if (listingStatus) filter.listingStatus = listingStatus;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Hackathon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Hackathon.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ── Get single hackathon by id ────────────────────────────────────
export const adminGetHackathon = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, 'Invalid hackathon ID.');
  const hackathon = await Hackathon.findById(id).lean();
  if (!hackathon) throw createError(404, 'Hackathon not found.');
  return hackathon;
};

// ── Create hackathon ──────────────────────────────────────────────
export const adminCreateHackathon = async (
  payload: AdminHackathonPayload,
  adminId: string,
) => {
  const baseSlug = slugify(payload.name, payload.startDate);
  const slug = await uniqueSlug(baseSlug);

  const hackathon = await Hackathon.create({
    ...payload,
    slug,
    normalizedName: payload.name.trim().toLowerCase(),
    normalizedOrganizer: payload.organizer.trim().toLowerCase(),
    createdBy: adminId,
    lastUpdatedAt: new Date(),
  });

  return hackathon.toObject();
};

// ── Update hackathon ──────────────────────────────────────────────
export const adminUpdateHackathon = async (
  id: string,
  payload: Partial<AdminHackathonPayload>,
  adminId: string,
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, 'Invalid hackathon ID.');
  const existing = await Hackathon.findById(id);
  if (!existing) throw createError(404, 'Hackathon not found.');

  // Re-slug only if name or startDate changed
  const nameChanged = payload.name && payload.name !== existing.name;
  const dateChanged = payload.startDate && payload.startDate !== existing.startDate.toISOString();
  if (nameChanged || dateChanged) {
    const baseName = payload.name ?? existing.name;
    const baseDate = payload.startDate ?? existing.startDate.toISOString();
    const newBase = slugify(baseName, baseDate);
    const newSlug = await uniqueSlug(newBase, id);
    payload = { ...payload, slug: newSlug } as AdminHackathonPayload & { slug: string };
  }

  Object.assign(existing, payload, {
    lastUpdatedAt: new Date(),
    approvedBy: payload.listingStatus === 'PUBLISHED' ? adminId : existing.approvedBy,
    approvedAt: payload.listingStatus === 'PUBLISHED' && !existing.approvedAt ? new Date() : existing.approvedAt,
  });

  await existing.save();
  return existing.toObject();
};

// ── Delete hackathon ──────────────────────────────────────────────
export const adminDeleteHackathon = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, 'Invalid hackathon ID.');
  const result = await Hackathon.findByIdAndDelete(id);
  if (!result) throw createError(404, 'Hackathon not found.');
  return { deleted: true };
};

// ── Publish / Unpublish ───────────────────────────────────────────
export const adminSetListingStatus = async (
  id: string,
  status: HackathonListingStatus,
  adminId: string,
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, 'Invalid hackathon ID.');
  const hackathon = await Hackathon.findById(id);
  if (!hackathon) throw createError(404, 'Hackathon not found.');

  hackathon.listingStatus = status;
  hackathon.lastUpdatedAt = new Date();
  if (status === 'PUBLISHED' && !hackathon.approvedAt) {
    hackathon.approvedBy = new mongoose.Types.ObjectId(adminId) as unknown as typeof hackathon.approvedBy;
    hackathon.approvedAt = new Date();
  }
  await hackathon.save();
  return hackathon.toObject();
};

// Re-export constants so the route can use them
export { HACKATHON_DOMAINS, HACKATHON_LIFECYCLE_STATUSES, HACKATHON_LISTING_STATUSES, HACKATHON_MODES, HACKATHON_SOURCE_TYPES };
