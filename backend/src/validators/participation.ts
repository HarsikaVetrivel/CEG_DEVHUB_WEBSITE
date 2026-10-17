import { z } from 'zod';
import { PARTICIPATION_STATUSES, PARTICIPATION_OUTCOMES } from '../models/Participation.js';

export const createParticipationSchema = z.object({
  hackathonId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid hackathon ID.'),
  teamName: z.string().trim().max(120).optional().nullable(),
});

export const updateParticipationSchema = z
  .object({
    status: z.enum(PARTICIPATION_STATUSES).optional(),
    outcome: z.enum(PARTICIPATION_OUTCOMES).optional().nullable(),
    teamName: z.string().trim().max(120).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
    completedAt: z.string().datetime().optional().nullable(),
    proofUrl: z.string().url('Must be a valid URL.').max(2000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.outcome && data.status && data.status !== 'COMPLETED') return false;
      return true;
    },
    { message: 'Outcome can only be set when status is COMPLETED.', path: ['outcome'] },
  )
  .refine(
    (data) => {
      const podiumOutcomes = ['WINNER', 'RUNNER_UP', 'FINALIST'];
      if (data.outcome && podiumOutcomes.includes(data.outcome) && !data.proofUrl) return false;
      return true;
    },
    { message: 'A proof URL is required for WINNER, RUNNER_UP, or FINALIST outcomes.', path: ['proofUrl'] },
  );

export const rankingsQuerySchema = z.object({
  sort: z.enum(['completions', 'wins']).default('completions'),
  domain: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
