import mongoose from 'mongoose';

/**
 * All achievement keys. Adding a new key here is sufficient to define a new
 * achievement — the checker in services/participation.ts reads this list.
 */
export const ACHIEVEMENT_KEYS = [
  'FIRST_HACKATHON',   // Completed first hackathon
  'FIVE_HACKATHONS',   // Completed 5 hackathons
  'TEN_HACKATHONS',    // Completed 10 hackathons
  'FIRST_WIN',         // Won any hackathon
  'THREE_WINS',        // Won 3 hackathons
  'PODIUM_3',          // Reached top-3 outcome in any hackathon
  'TEAM_PLAYER',       // Joined or created 3 teams (via teammate system)
  'STREAK_3',          // Participated in 3 different calendar months
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

/** Human-readable metadata for each achievement key */
export const ACHIEVEMENT_META: Record<
  AchievementKey,
  { label: string; description: string; icon: string }
> = {
  FIRST_HACKATHON: {
    label: 'First Steps',
    description: 'Completed your first hackathon.',
    icon: '🎯',
  },
  FIVE_HACKATHONS: {
    label: 'Serial Hacker',
    description: 'Completed 5 hackathons.',
    icon: '⚡',
  },
  TEN_HACKATHONS: {
    label: 'Hackathon Veteran',
    description: 'Completed 10 hackathons.',
    icon: '🏅',
  },
  FIRST_WIN: {
    label: 'Gold Medal',
    description: 'Won your first hackathon.',
    icon: '🥇',
  },
  THREE_WINS: {
    label: 'Champion',
    description: 'Won 3 hackathons.',
    icon: '🏆',
  },
  PODIUM_3: {
    label: 'Podium Finisher',
    description: 'Reached a top-3 position in any hackathon.',
    icon: '🎖️',
  },
  TEAM_PLAYER: {
    label: 'Team Player',
    description: 'Joined or created 3 teams.',
    icon: '🤝',
  },
  STREAK_3: {
    label: 'On a Roll',
    description: 'Participated in hackathons across 3 different calendar months.',
    icon: '🔥',
  },
};

const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    achievementKey: {
      type: String,
      enum: ACHIEVEMENT_KEYS,
      required: true,
    },
    earnedAt: {
      type: Date,
      default: () => new Date(),
    },
    /** The hackathon that triggered this achievement, if applicable. */
    hackathonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hackathon',
      default: null,
    },
  },
  { timestamps: true },
);

// Each user can earn each achievement only once
userAchievementSchema.index({ userId: 1, achievementKey: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, earnedAt: -1 });

export default mongoose.models.UserAchievement ??
  mongoose.model('UserAchievement', userAchievementSchema);
