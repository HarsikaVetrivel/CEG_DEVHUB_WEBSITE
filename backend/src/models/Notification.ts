import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['DEADLINE_REMINDER', 'SYSTEM'] as const;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon' },
    dedupeKey: { type: String, required: true },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export default mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);
