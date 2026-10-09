import { z } from 'zod';

import {
  HACKATHON_DOMAINS,
  HACKATHON_LIFECYCLE_STATUSES,
  HACKATHON_MODES,
} from '../models/Hackathon.js';

const dateQuery = z.string().datetime({ offset: true });

export const hackathonListQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    location: z.string().trim().max(200).optional(),
    mode: z.enum(HACKATHON_MODES).optional(),
    domain: z.enum(HACKATHON_DOMAINS).optional(),
    status: z.enum(HACKATHON_LIFECYCLE_STATUSES).optional(),
    startAfter: dateQuery.optional(),
    startBefore: dateQuery.optional(),
    endAfter: dateQuery.optional(),
    endBefore: dateQuery.optional(),
    deadlineAfter: dateQuery.optional(),
    deadlineBefore: dateQuery.optional(),
    sort: z.enum(['deadline', 'eventDate', 'recent']).default('deadline'),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .strict()
  .refine(
    ({ startAfter, startBefore }) =>
      !startAfter || !startBefore || new Date(startAfter) <= new Date(startBefore),
    { message: 'startAfter must be earlier than or equal to startBefore.', path: ['startAfter'] },
  )
  .refine(
    ({ endAfter, endBefore }) =>
      !endAfter || !endBefore || new Date(endAfter) <= new Date(endBefore),
    { message: 'endAfter must be earlier than or equal to endBefore.', path: ['endAfter'] },
  )
  .refine(
    ({ deadlineAfter, deadlineBefore }) =>
      !deadlineAfter || !deadlineBefore || new Date(deadlineAfter) <= new Date(deadlineBefore),
    {
      message: 'deadlineAfter must be earlier than or equal to deadlineBefore.',
      path: ['deadlineAfter'],
    },
  );

export const hackathonSlugSchema = z.object({
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type HackathonListQuery = z.infer<typeof hackathonListQuerySchema>;
