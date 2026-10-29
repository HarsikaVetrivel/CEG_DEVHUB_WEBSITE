import mongoose from 'mongoose';
import Hackathon from '../../src/models/Hackathon';

/** Minimal valid hackathon payload with all required fields */
export function hackathonBase(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Hackathon',
    slug: 'test-hackathon',
    organizer: 'CEG',
    description: 'A test hackathon for automated testing.',
    registrationUrl: 'https://example.com/register',
    startDate: new Date('2099-01-01'),
    endDate: new Date('2099-01-03'),
    registrationDeadline: new Date('2099-01-01'),
    location: 'Chennai, India',
    mode: 'ONLINE' as const,
    domains: ['Web Development'] as const,
    eligibility: 'Open to all students',
    minimumTeamSize: 1,
    maximumTeamSize: 4,
    prizeDetails: 'Cash prizes worth ₹50,000',
    lifecycleStatus: 'UPCOMING' as const,
    listingStatus: 'PUBLISHED' as const,
    sourceType: 'ADMIN' as const,
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

/** Insert a valid published hackathon into the test DB */
export async function seedHackathon(overrides: Record<string, unknown> = {}) {
  return Hackathon.create(hackathonBase(overrides));
}
