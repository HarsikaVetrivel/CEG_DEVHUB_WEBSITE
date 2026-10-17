import mongoose from 'mongoose';

export const TEAM_REQUEST_STATUSES = ['OPEN', 'FULL', 'CLOSED'] as const;
export type TeamRequestStatus = (typeof TEAM_REQUEST_STATUSES)[number];

const teamRequestSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hackathonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hackathon',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    skillsNeeded: {
      type: [String],
      default: [],
    },
    currentTeamSize: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 1,
    },
    maxTeamSize: {
      type: Number,
      required: true,
      min: 2,
      max: 10,
    },
    status: {
      type: String,
      enum: TEAM_REQUEST_STATUSES,
      default: 'OPEN',
      required: true,
    },
  },
  { timestamps: true },
);

// Browse open requests for a hackathon
teamRequestSchema.index({ hackathonId: 1, status: 1 });
// My open requests
teamRequestSchema.index({ creatorId: 1, status: 1 });
// Discovery feed sorted by recency
teamRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.TeamRequest ??
  mongoose.model('TeamRequest', teamRequestSchema);
