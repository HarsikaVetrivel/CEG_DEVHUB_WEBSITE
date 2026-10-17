/**
 * Shared UI constants for CEG DEV HUB.
 *
 * This file is the single source of truth for domain names and year options
 * shared across ProfileDrawer, AdminPage (HackathonFormModal), and the
 * Hackathons filter panel.
 *
 * NOTE: DOMAINS must stay in sync with:
 *   - backend/src/models/Hackathon.ts ? HACKATHON_DOMAINS
 *   - backend/src/validators/auth.ts  ? STUDENT_DOMAINS
 * When adding a new domain, update all three locations.
 */

export const DOMAINS = [
  "AI/ML",
  "Web Development",
  "Mobile Development",
  "Blockchain",
  "Cybersecurity",
  "IoT",
  "Cloud",
  "Data Science",
  "AR/VR",
  "Open Innovation",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const YEAR_OPTIONS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
  { value: 5, label: "5th Year" },
] as const;
