import { z } from 'zod';
import { TEAM_APPLICATION_STATUSES } from '../models/TeamApplication.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID.');

export const createTeamRequestSchema = z
  .object({
    hackathonId: objectId,
    title: z.string().trim().min(5).max(100),
    description: z.string().trim().min(10).max(600),
    skillsNeeded: z.array(z.string().trim().max(50)).max(10).default([]),
    currentTeamSize: z.number().int().min(1).max(10).default(1),
    maxTeamSize: z.number().int().min(2).max(10),
  })
  .refine((d) => d.currentTeamSize < d.maxTeamSize, {
    message: 'currentTeamSize must be less than maxTeamSize.',
    path: ['currentTeamSize'],
  });

export const updateTeamRequestSchema = z
  .object({
    title: z.string().trim().min(5).max(100).optional(),
    description: z.string().trim().min(10).max(600).optional(),
    skillsNeeded: z.array(z.string().trim().max(50)).max(10).optional(),
    currentTeamSize: z.number().int().min(1).max(10).optional(),
    maxTeamSize: z.number().int().min(2).max(10).optional(),
    status: z.enum(['OPEN', 'FULL', 'CLOSED']).optional(),
  });

export const applyToTeamSchema = z.object({
  message: z.string().trim().min(10).max(400),
});

export const respondToApplicationSchema = z.object({
  status: z.enum(
    TEAM_APPLICATION_STATUSES.filter((s) => s !== 'PENDING') as [string, ...string[]],
  ),
});

export const teammateDiscoveryQuerySchema = z.object({
  hackathonId: objectId.optional(),
  skill: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
