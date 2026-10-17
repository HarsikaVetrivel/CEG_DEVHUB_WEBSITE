import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'DEADLINE_REMINDER',
  'SYSTEM',
  'achievement',
  'team_application',
  'team_application_response',
] as const;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    /** Main notification body text (was 'message'). */
    body: { type: String, trim: true, maxlength: 1000 },
    /** Legacy alias — kept for backward compat with reminder notifications. */
    message: { type: String, trim: true, maxlength: 1000 },
    hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon' },
    /** Optional: points to a related document (e.g. TeamApplication _id). */
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    /** Optional deduplication key — required only for DEADLINE_REMINDER. */
    dedupeKey: { type: String, sparse: true },
    readAt: { type: Date },
  },
  { timestamps: true },
);

// Sparse unique index — only enforces uniqueness when dedupeKey is present
notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export default mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);
