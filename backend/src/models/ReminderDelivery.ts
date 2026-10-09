import mongoose from 'mongoose';

export const REMINDER_DELIVERY_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SENT',
  'CANCELLED',
  'FAILED',
] as const;

const reminderDeliverySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
    daysBefore: { type: Number, required: true, min: 0, max: 365 },
    deadlineAt: { type: Date, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    dedupeKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: REMINDER_DELIVERY_STATUSES,
      default: 'PENDING',
      required: true,
    },
    attemptCount: { type: Number, default: 0, min: 0 },
    leaseUntil: { type: Date },
    lastError: { type: String, maxlength: 500 },
    notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification' },
  },
  { timestamps: true },
);

reminderDeliverySchema.index({ status: 1, scheduledAt: 1 });
reminderDeliverySchema.index({ userId: 1, hackathonId: 1, deadlineAt: 1 });

export default mongoose.models.ReminderDelivery ??
  mongoose.model('ReminderDelivery', reminderDeliverySchema);
