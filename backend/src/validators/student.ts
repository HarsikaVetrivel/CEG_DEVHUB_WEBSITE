import { z } from 'zod';

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .strict();

export const reminderPreferencesSchema = z
  .object({
    enabled: z.boolean(),
    daysBefore: z.array(z.number().int().min(1).max(365)).max(5),
    timeZone: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Use a valid IANA time zone.'),
  })
  .strict()
  .refine((value) => new Set(value.daysBefore).size === value.daysBefore.length, {
    message: 'Reminder intervals must not contain duplicates.',
    path: ['daysBefore'],
  });

export const objectIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
});
