import mongoose from 'mongoose';

export const HACKATHON_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const;
export const HACKATHON_DOMAINS = [
  'AI/ML',
  'Web Development',
  'Mobile Development',
  'Blockchain',
  'Cybersecurity',
  'IoT',
  'Cloud',
  'Data Science',
  'AR/VR',
  'Open Innovation',
] as const;
export const HACKATHON_LIFECYCLE_STATUSES = [
  'UPCOMING',
  'ONGOING',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
] as const;
export const HACKATHON_LISTING_STATUSES = ['PENDING', 'PUBLISHED', 'ARCHIVED', 'REJECTED'] as const;
export const HACKATHON_SOURCE_TYPES = ['ADMIN', 'API', 'RSS', 'ORGANIZER_FEED', 'MANUAL'] as const;
export const HACKATHON_VERIFICATION_STATUSES = ['UNVERIFIED', 'VERIFIED', 'REJECTED'] as const;

export type HackathonMode = (typeof HACKATHON_MODES)[number];
export type HackathonDomain = (typeof HACKATHON_DOMAINS)[number];
export type HackathonLifecycleStatus = (typeof HACKATHON_LIFECYCLE_STATUSES)[number];
export type HackathonListingStatus = (typeof HACKATHON_LISTING_STATUSES)[number];
export type HackathonSourceType = (typeof HACKATHON_SOURCE_TYPES)[number];
export type HackathonVerificationStatus = (typeof HACKATHON_VERIFICATION_STATUSES)[number];

const hackathonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    normalizedOrganizer: { type: String, required: true, trim: true, lowercase: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    organizer: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 12000 },
    registrationUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => {
          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Registration URL must use HTTP or HTTPS.',
      },
    },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(this: { startDate?: Date }, value: Date) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'Event end date must be on or after the start date.',
      },
    },
    registrationDeadline: { type: Date, required: true },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    mode: { type: String, enum: HACKATHON_MODES, required: true },
    domains: {
      type: [{ type: String, enum: HACKATHON_DOMAINS }],
      required: true,
      validate: {
        validator: (domains: string[]) => domains.length > 0,
        message: 'At least one domain is required.',
      },
    },
    eligibility: { type: String, required: true, trim: true, maxlength: 1000 },
    minimumTeamSize: { type: Number, required: true, min: 1, max: 100 },
    maximumTeamSize: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      validate: {
        validator(this: { minimumTeamSize?: number }, value: number) {
          return this.minimumTeamSize === undefined || value >= this.minimumTeamSize;
        },
        message: 'Maximum team size must be at least the minimum team size.',
      },
    },
    prizeDetails: { type: String, required: true, trim: true, maxlength: 2000 },
    requiredSkills: { type: [String], default: [] },
    lifecycleStatus: { type: String, enum: HACKATHON_LIFECYCLE_STATUSES, required: true },
    listingStatus: {
      type: String,
      enum: HACKATHON_LISTING_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    sourceType: { type: String, enum: HACKATHON_SOURCE_TYPES, required: true },
    sourceUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value?: string) => {
          if (!value) return true;
          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Source URL must use HTTP or HTTPS.',
      },
    },
    externalSourceId: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: HACKATHON_VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

hackathonSchema.pre('validate', function normalizeListing() {
  if (this.name) {
    this.normalizedName = this.name.trim().toLocaleLowerCase('en-US');
  }
  if (this.organizer) {
    this.normalizedOrganizer = this.organizer.trim().toLocaleLowerCase('en-US');
  }
});

hackathonSchema.index({ listingStatus: 1, registrationDeadline: 1 });
hackathonSchema.index({ listingStatus: 1, startDate: 1, endDate: 1 });
hackathonSchema.index({ domains: 1, mode: 1, listingStatus: 1 });
hackathonSchema.index({ name: 'text', organizer: 'text', description: 'text', requiredSkills: 'text' });
hackathonSchema.index(
  { normalizedName: 1, normalizedOrganizer: 1, startDate: 1 },
  { unique: true, name: 'unique_normalized_event' },
);
hackathonSchema.index(
  { sourceType: 1, externalSourceId: 1 },
  {
    unique: true,
    name: 'unique_external_source',
    partialFilterExpression: { externalSourceId: { $type: 'string' } },
  },
);

export default mongoose.models.Hackathon ?? mongoose.model('Hackathon', hackathonSchema);
