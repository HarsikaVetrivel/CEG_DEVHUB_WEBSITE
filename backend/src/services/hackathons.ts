import mongoose from 'mongoose';

import Hackathon, { type HackathonLifecycleStatus } from '../models/Hackathon.js';
import type { HackathonListQuery } from '../validators/hackathons.js';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type HackathonQuery = mongoose.QueryFilter<unknown>;

type HackathonSort = Record<string, 1 | -1>;
const sorts: Record<HackathonListQuery['sort'], HackathonSort> = {
  deadline: { registrationDeadline: 1, _id: 1 },
  eventDate: { startDate: 1, _id: 1 },
  recent: { createdAt: -1, _id: -1 },
};

export const listPublishedHackathons = async (query: HackathonListQuery) => {
  const filter: HackathonQuery = { listingStatus: 'PUBLISHED' };
  const andFilters: HackathonQuery[] = [];

  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    andFilters.push({
      $or: [
        { name: pattern },
        { organizer: pattern },
        { description: pattern },
        { requiredSkills: pattern },
      ],
    });
  }

  if (query.location) {
    filter.location = new RegExp(escapeRegex(query.location), 'i');
  }
  if (query.mode) {
    filter.mode = query.mode;
  }
  if (query.domain) {
    filter.domains = query.domain;
  }
  if (query.startAfter || query.startBefore) {
    filter.startDate = {
      ...(query.startAfter && { $gte: new Date(query.startAfter) }),
      ...(query.startBefore && { $lte: new Date(query.startBefore) }),
    };
  }
  if (query.endAfter || query.endBefore) {
    filter.endDate = {
      ...(query.endAfter && { $gte: new Date(query.endAfter) }),
      ...(query.endBefore && { $lte: new Date(query.endBefore) }),
    };
  }
  if (query.deadlineAfter || query.deadlineBefore) {
    filter.registrationDeadline = {
      ...(query.deadlineAfter && { $gte: new Date(query.deadlineAfter) }),
      ...(query.deadlineBefore && { $lte: new Date(query.deadlineBefore) }),
    };
  }
  if (query.status) {
    filter.lifecycleStatus = query.status;
  }
  if (andFilters.length) {
    filter.$and = andFilters;
  }

  const sort = sorts[query.sort];
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Hackathon.find(filter)
      .select(
        '-__v -normalizedName -normalizedOrganizer -externalSourceId -listingStatus -createdBy -approvedBy -approvedAt',
      )
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Hackathon.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      hasNextPage: skip + items.length < total,
      hasPreviousPage: query.page > 1,
    },
  };
};

export const getPublishedHackathonBySlug = async (slug: string) => {
  return Hackathon.findOne({ slug, listingStatus: 'PUBLISHED' })
    .select(
      '-__v -normalizedName -normalizedOrganizer -externalSourceId -listingStatus -createdBy -approvedBy -approvedAt',
    )
    .lean();
};
