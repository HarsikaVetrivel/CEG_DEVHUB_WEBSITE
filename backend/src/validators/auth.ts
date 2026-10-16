import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().trim().min(3, 'Username or email is required.').max(128),
  password: z.string().min(8).max(128),
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
