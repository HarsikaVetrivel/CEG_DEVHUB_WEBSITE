import mongoose from 'mongoose';

export const TEAM_APPLICATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export type TeamApplicationStatus = (typeof TEAM_APPLICATION_STATUSES)[number];

const teamApplicationSchema = new mongoose.Schema(
  {
    teamRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamRequest',
      required: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    status: {
      type: String,
      enum: TEAM_APPLICATION_STATUSES,
      default: 'PENDING',
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate applications
teamApplicationSchema.index({ teamRequestId: 1, applicantId: 1 }, { unique: true });
// My sent applications
teamApplicationSchema.index({ applicantId: 1, status: 1 });
// Incoming applications for a request
teamApplicationSchema.index({ teamRequestId: 1, status: 1 });

export default mongoose.models.TeamApplication ??
  mongoose.model('TeamApplication', teamApplicationSchema);
