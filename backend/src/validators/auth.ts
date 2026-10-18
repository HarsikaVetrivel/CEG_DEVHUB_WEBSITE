import { z } from 'zod';

/** Shared password validation rule used on registration and password reset. */
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g. @, #, !).');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email('Must be a valid email address.')
    .endsWith('@student.annauniv.edu', 'Only @student.annauniv.edu email addresses are allowed.'),
  password: strongPassword,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().trim().min(3, 'Username or email is required.').max(128),
  password: z.string().min(1, 'Password is required.').max(128),
});

export const STUDENT_DOMAINS = [
  'AI/ML', 'Web Development', 'Mobile Development', 'Blockchain',
  'Cybersecurity', 'IoT', 'Cloud', 'Data Science', 'AR/VR', 'Open Innovation',
] as const;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  yearOfStudy: z.number().int().min(1).max(7).optional().nullable(),
  course: z.string().trim().max(120).optional().nullable(),
  interestedDomains: z.array(z.enum(STUDENT_DOMAINS)).max(10).optional(),
  // email is intentionally excluded — it cannot be changed after registration
});
