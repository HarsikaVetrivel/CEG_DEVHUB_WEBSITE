import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  },
  { timestamps: true },
);

bookmarkSchema.index({ userId: 1, hackathonId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Bookmark ?? mongoose.model('Bookmark', bookmarkSchema);
