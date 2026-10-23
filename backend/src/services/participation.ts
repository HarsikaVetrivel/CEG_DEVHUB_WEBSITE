import mongoose from 'mongoose';
import Participation, {
  type ParticipationStatus,
  type ParticipationOutcome,
  VERIFIABLE_OUTCOMES,
} from '../models/Participation.js';
import UserAchievement, {
  ACHIEVEMENT_META,
  type AchievementKey,
} from '../models/UserAchievement.js';
import Hackathon from '../models/Hackathon.js';
import Notification from '../models/Notification.js';
import { createError } from '../utils/errors.js';

async function checkAndAwardAchievements(
  userId: string,
  triggeredByHackathonId?: string,
): Promise<AchievementKey[]> {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [completedCount, winCount, podiumCount, registeredDates] = await Promise.all([
    Participation.countDocuments({ userId: objectUserId, status: 'COMPLETED' }),
    Participation.countDocuments({ userId: objectUserId, outcome: 'WINNER' }),
    Participation.countDocuments({ userId: objectUserId, outcome: { $in: ['WINNER', 'RUNNER_UP', 'FINALIST'] } }),
    Participation.distinct('registeredAt', { userId: objectUserId }) as Promise<Date[]>,
  ]);
  const uniqueMonths = new Set(
    registeredDates.map((d) => `${new Date(d).getFullYear()}-${new Date(d).getMonth()}`),
  ).size;
  const candidates: AchievementKey[] = [];
  if (completedCount >= 1)  candidates.push('FIRST_HACKATHON');
  if (completedCount >= 5)  candidates.push('FIVE_HACKATHONS');
  if (completedCount >= 10) candidates.push('TEN_HACKATHONS');
  if (winCount >= 1)        candidates.push('FIRST_WIN');
  if (winCount >= 3)        candidates.push('THREE_WINS');
  if (podiumCount >= 1)     candidates.push('PODIUM_3');
  if (uniqueMonths >= 3)    candidates.push('STREAK_3');
  const newlyAwarded: AchievementKey[] = [];
  for (const key of candidates) {
    const result = await UserAchievement.updateOne(
      { userId: objectUserId, achievementKey: key },
      { $setOnInsert: { userId: objectUserId, achievementKey: key, earnedAt: new Date(), hackathonId: triggeredByHackathonId ?? null } },
      { upsert: true },
    );
    if (result.upsertedCount > 0) newlyAwarded.push(key);
  }
  if (newlyAwarded.length > 0) {
    await Notification.insertMany(
      newlyAwarded.map((key) => ({
        userId: objectUserId,
        type: 'achievement',
        title: `Achievement unlocked: ${ACHIEVEMENT_META[key].icon} ${ACHIEVEMENT_META[key].label}`,
        body: ACHIEVEMENT_META[key].description,
      })),
    );
  }
  return newlyAwarded;
}
export { checkAndAwardAchievements };

export const createParticipation = async (userId: string, hackathonId: string, teamName?: string | null) => {
  const hackathon = await Hackathon.findOne({ _id: hackathonId, listingStatus: 'PUBLISHED' }).select('_id name');
  if (!hackathon) throw createError(404, 'Published hackathon not found.');
  const existing = await Participation.findOne({ userId, hackathonId });
  if (existing) throw createError(409, 'You are already registered for this hackathon.');
  const participation = await Participation.create({ userId, hackathonId, teamName: teamName ?? null, status: 'REGISTERED', registeredAt: new Date() });
  return participation.toObject();
};

export const updateParticipation = async (
  userId: string, participationId: string,
  patch: {
    status?: ParticipationStatus;
    outcome?: ParticipationOutcome | null;
    teamName?: string | null;
    note?: string | null;
    completedAt?: string | null;
    proofUrl?: string | null;
  },
) => {
  if (!mongoose.isValidObjectId(participationId)) throw createError(400, 'Invalid participation ID.');

  // Issue 3: podium claims only allowed after the hackathon has ended
  const isPodiumClaim = patch.outcome && (VERIFIABLE_OUTCOMES as readonly string[]).includes(patch.outcome);
  if (isPodiumClaim) {
    const existing = await Participation.findOne({ _id: participationId, userId }).select('hackathonId');
    if (!existing) throw createError(404, 'Participation not found.');
    const hackathon = await Hackathon.findById(existing.hackathonId).select('endDate registrationDeadline');
    // Use registration deadline as the cutoff (the event must be over)
    const cutoff = hackathon?.endDate ?? hackathon?.registrationDeadline;
    if (!cutoff || new Date() < new Date(cutoff)) {
      throw createError(400, 'You can only claim a podium outcome after the hackathon has ended.');
    }
  }

  const update: Record<string, unknown> = {};
  if (patch.status !== undefined)    update['status']    = patch.status;
  if (patch.outcome !== undefined)   update['outcome']   = patch.outcome;
  if (patch.teamName !== undefined)  update['teamName']  = patch.teamName;
  if (patch.note !== undefined)      update['note']      = patch.note;
  if (patch.proofUrl !== undefined)  update['proofUrl']  = patch.proofUrl;
  if (patch.status === 'COMPLETED')  update['completedAt'] = patch.completedAt ? new Date(patch.completedAt) : new Date();

  // Auto-set verificationStatus when outcome changes
  if (patch.outcome !== undefined) {
    if (patch.outcome && (VERIFIABLE_OUTCOMES as readonly string[]).includes(patch.outcome)) {
      update['verificationStatus'] = 'UNVERIFIED';
    } else {
      update['verificationStatus'] = null;
    }
  }

  const participation = await Participation.findOneAndUpdate(
    { _id: participationId, userId },
    { $set: update },
    { new: true },
  );
  if (!participation) throw createError(404, 'Participation not found.');
  await checkAndAwardAchievements(userId, participation.hackathonId.toString());
  return participation.toObject();
};

export const getMyParticipations = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [result] = await Participation.aggregate([
    { $match: { userId: objectUserId } },
    { $facet: {
      items: [
        { $sort: { registeredAt: -1 } }, { $skip: skip }, { $limit: limit },
        { $lookup: { from: 'hackathons', localField: 'hackathonId', foreignField: '_id', as: 'hackathon',
            pipeline: [{ $project: { name: 1, slug: 1, organizer: 1, startDate: 1, endDate: 1, registrationDeadline: 1, domains: 1, mode: 1 } }] } },
        { $unwind: { path: '$hackathon', preserveNullAndEmptyArrays: true } },
      ],
      total: [{ $count: 'n' }],
    } },
  ]);
  const total = (result?.total?.[0]?.n as number) ?? 0;
  return { items: result?.items ?? [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
};

export const getParticipationById = async (userId: string, participationId: string) => {
  if (!mongoose.isValidObjectId(participationId)) throw createError(400, 'Invalid participation ID.');
  const p = await Participation.findOne({ _id: participationId, userId }).populate('hackathonId', 'name slug organizer startDate endDate registrationDeadline');
  if (!p) throw createError(404, 'Participation not found.');
  return p;
};

export const withdrawParticipation = async (userId: string, participationId: string) => {
  if (!mongoose.isValidObjectId(participationId)) throw createError(400, 'Invalid participation ID.');
  const p = await Participation.findOneAndUpdate({ _id: participationId, userId }, { $set: { status: 'WITHDREW' } }, { new: true });
  if (!p) throw createError(404, 'Participation not found.');
  return p.toObject();
};

export const getMyAchievements = async (userId: string) => {
  const achievements = await UserAchievement.find({ userId }).sort({ earnedAt: -1 }).populate('hackathonId', 'name slug');
  return achievements.map((a) => ({ ...a.toObject(), meta: ACHIEVEMENT_META[a.achievementKey as AchievementKey] }));
};

export const getLeaderboard = async (sort: 'completions' | 'wins', domain: string | undefined, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const hackathonMatch: Record<string, unknown> = { listingStatus: 'PUBLISHED' };
  if (domain) hackathonMatch['domains'] = domain;
  const hackathonIds = domain ? await Hackathon.find(hackathonMatch).distinct('_id') : null;

  const participationMatch: Record<string, unknown> = { status: { $ne: 'WITHDREW' } };
  if (hackathonIds) participationMatch['hackathonId'] = { $in: hackathonIds };

  // Only VERIFIED podium outcomes count toward wins/podiums on the leaderboard.
  // An unverified or rejected claim is not counted until an admin approves it.
  const isVerifiedWinner   = { $and: [{ $eq: ['$outcome', 'WINNER'] },  { $eq: ['$verificationStatus', 'VERIFIED'] }] };
  const isVerifiedPodium   = { $and: [{ $in: ['$outcome', ['WINNER', 'RUNNER_UP', 'FINALIST']] }, { $eq: ['$verificationStatus', 'VERIFIED'] }] };

  // Minimum threshold: for "completions" sort, only students who completed ≥1 hackathon appear.
  // For "wins" sort, only students with ≥1 verified win appear.
  // This prevents students who merely registered (but never finished) from occupying top ranks.
  const minimumFilter = sort === 'wins'
    ? { wins: { $gt: 0 } }
    : { completions: { $gt: 0 } };

  const pipeline: mongoose.PipelineStage[] = [
    { $match: participationMatch },
    { $group: {
      _id: '$userId',
      participations: { $sum: 1 },
      completions:    { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
      wins:           { $sum: { $cond: [isVerifiedWinner, 1, 0] } },
      podiums:        { $sum: { $cond: [isVerifiedPodium, 1, 0] } },
      // Track whether the student has any UNVERIFIED podium claim for the badge
      hasUnverifiedClaim: { $max: {
        $cond: [
          { $and: [
            { $in: ['$outcome', ['WINNER', 'RUNNER_UP', 'FINALIST']] },
            { $in: ['$verificationStatus', ['UNVERIFIED', null]] },
          ] },
          1, 0,
        ],
      } },
    } },
    // ── Only rank students who meet the minimum activity threshold ──────────
    { $match: minimumFilter },
    { $sort: sort === 'wins'
      ? { wins: -1, completions: -1, participations: -1 } as any
      : { completions: -1, wins: -1, participations: -1 } as any },
    { $facet: {
      items: [
        { $skip: skip }, { $limit: limit },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user',
            pipeline: [{ $project: { fullName: 1, course: 1, yearOfStudy: 1, interestedDomains: 1 } }] } },
        { $unwind: '$user' },
        // topVerificationStatus: VERIFIED if wins>0, UNVERIFIED if pending, else null
        { $addFields: {
          topVerificationStatus: {
            $cond: [{ $gt: ['$wins', 0] }, 'VERIFIED',
              { $cond: [{ $eq: ['$hasUnverifiedClaim', 1] }, 'UNVERIFIED', null] }],
          },
        } },
      ],
      total: [{ $count: 'n' }],
    } },
  ];
  const [result] = await Participation.aggregate(pipeline);
  const total = (result?.total?.[0]?.n as number) ?? 0;
  return { items: result?.items ?? [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
};

export const getHackathonParticipants = async (hackathonId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const objectId = new mongoose.Types.ObjectId(hackathonId);
  const [result] = await Participation.aggregate([
    { $match: { hackathonId: objectId, status: { $ne: 'WITHDREW' } } },
    { $facet: {
      items: [
        { $sort: { registeredAt: 1 } }, { $skip: skip }, { $limit: limit },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user', pipeline: [{ $project: { fullName: 1, course: 1, yearOfStudy: 1 } }] } },
        { $unwind: '$user' },
        { $project: { status: 1, outcome: 1, teamName: 1, registeredAt: 1, user: 1 } },
      ],
      total: [{ $count: 'n' }],
    } },
  ]);
  const total = (result?.total?.[0]?.n as number) ?? 0;
  return { items: result?.items ?? [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getParticipationSummary = async (userId: string) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [total, completed, wins, recentAchievements] = await Promise.all([
    Participation.countDocuments({ userId: objectUserId, status: { $ne: 'WITHDREW' } }),
    Participation.countDocuments({ userId: objectUserId, status: 'COMPLETED' }),
    Participation.countDocuments({ userId: objectUserId, outcome: 'WINNER' }),
    UserAchievement.find({ userId: objectUserId }).sort({ earnedAt: -1 }).limit(5),
  ]);
  return { total, completed, wins, recentAchievements: recentAchievements.map((a) => ({ ...a.toObject(), meta: ACHIEVEMENT_META[a.achievementKey as AchievementKey] })) };
};
