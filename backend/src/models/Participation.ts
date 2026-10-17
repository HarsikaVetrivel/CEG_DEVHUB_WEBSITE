import mongoose from 'mongoose';

export const PARTICIPATION_STATUSES = [
  'REGISTERED',
  'PARTICIPATING',
  'COMPLETED',
  'WITHDREW',
] as const;

export const PARTICIPATION_OUTCOMES = [
  'WINNER',
  'RUNNER_UP',
  'FINALIST',
  'PARTICIPANT',
] as const;

/** Outcomes that require proof and admin verification */
export const VERIFIABLE_OUTCOMES = ['WINNER', 'RUNNER_UP', 'FINALIST'] as const;

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];
export type ParticipationOutcome = (typeof PARTICIPATION_OUTCOMES)[number];

const participationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hackathonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hackathon',
      required: true,
    },
    status: {
      type: String,
      enum: PARTICIPATION_STATUSES,
      default: 'REGISTERED',
      required: true,
    },
    outcome: {
      type: String,
      enum: PARTICIPATION_OUTCOMES,
      default: null,
    },
    teamName: {
      type: String,
      maxlength: 120,
      default: null,
    },
    note: {
      type: String,
      maxlength: 500,
      default: null,
    },
    registeredAt: {
      type: Date,
      default: () => new Date(),
    },
    completedAt: {
      type: Date,
      default: null,
    },
    /** URL to evidence of win/placement (Devpost, LinkedIn cert, etc.) */
    proofUrl: {
      type: String,
      maxlength: 2000,
      default: null,
    },
    /**
     * Set automatically when outcome is WINNER / RUNNER_UP / FINALIST.
     * null = no podium claim made.
     * Admin reviews UNVERIFIED → VERIFIED or REJECTED.
     */
    verificationStatus: {
      type: String,
      enum: [...VERIFICATION_STATUSES, null],
      default: null,
    },
  },
  { timestamps: true },
);

// One participation record per student per hackathon
participationSchema.index({ userId: 1, hackathonId: 1 }, { unique: true });
// Powers rankings per hackathon
participationSchema.index({ hackathonId: 1, outcome: 1 });
// Powers "my participations" list
participationSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Participation ??
  mongoose.model('Participation', participationSchema);
