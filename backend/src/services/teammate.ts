import mongoose from 'mongoose';
import TeamRequest from '../models/TeamRequest.js';
import TeamApplication from '../models/TeamApplication.js';
import Hackathon from '../models/Hackathon.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { createError } from '../utils/errors.js';
import { checkAndAwardAchievements } from './participation.js';

/** Creates an open team request for a published hackathon. */
export const createTeamRequest = async (
  creatorId: string,
  payload: {
    hackathonId: string;
    title: string;
    description: string;
    skillsNeeded: string[];
    currentTeamSize: number;
    maxTeamSize: number;
  },
) => {
  // Only verified students may create team requests
  const creator = await User.findById(creatorId).select('emailVerified');
  if (!creator?.emailVerified)
    throw createError(403, 'You must verify your email before creating a team request.');

  const hackathon = await Hackathon.findOne({
    _id: payload.hackathonId,
    listingStatus: 'PUBLISHED',
  }).select('_id name registrationDeadline');
  if (!hackathon) throw createError(404, 'Published hackathon not found.');

  // Prevent duplicate open requests from the same creator for the same hackathon
  const existing = await TeamRequest.findOne({
    creatorId,
    hackathonId: payload.hackathonId,
    status: { $in: ['OPEN', 'FULL'] },
  });
  if (existing) throw createError(409, 'You already have an open team request for this hackathon.');

  const request = await TeamRequest.create({
    creatorId,
    hackathonId: payload.hackathonId,
    title: payload.title,
    description: payload.description,
    skillsNeeded: payload.skillsNeeded,
    currentTeamSize: payload.currentTeamSize,
    maxTeamSize: payload.maxTeamSize,
    status: 'OPEN',
  });
  return request.toObject();
};

/** Updates a team request (creator only). */
export const updateTeamRequest = async (
  creatorId: string,
  requestId: string,
  patch: Partial<{
    title: string;
    description: string;
    skillsNeeded: string[];
    currentTeamSize: number;
    maxTeamSize: number;
    status: 'OPEN' | 'FULL' | 'CLOSED';
  }>,
) => {
  if (!mongoose.isValidObjectId(requestId)) throw createError(400, 'Invalid request ID.');
  const request = await TeamRequest.findOneAndUpdate(
    { _id: requestId, creatorId },
    { $set: patch },
    { new: true, runValidators: true },
  );
  if (!request) throw createError(404, 'Team request not found.');
  return request.toObject();
};

/** Deletes a team request and all its pending applications. */
export const deleteTeamRequest = async (creatorId: string, requestId: string) => {
  if (!mongoose.isValidObjectId(requestId)) throw createError(400, 'Invalid request ID.');
  const request = await TeamRequest.findOneAndDelete({ _id: requestId, creatorId });
  if (!request) throw createError(404, 'Team request not found.');
  // Cancel any pending applications
  await TeamApplication.updateMany(
    { teamRequestId: requestId, status: 'PENDING' },
    { $set: { status: 'REJECTED' } },
  );
  return { deleted: true };
};

/** Returns the creator's team requests, paginated. */
export const getMyTeamRequests = async (creatorId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const objectCreatorId = new mongoose.Types.ObjectId(creatorId);
  const [result] = await TeamRequest.aggregate([
    { $match: { creatorId: objectCreatorId } },
    { $facet: {
      items: [
        { $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit },
        { $lookup: { from: 'hackathons', localField: 'hackathonId', foreignField: '_id', as: 'hackathon',
            pipeline: [{ $project: { name: 1, slug: 1, registrationDeadline: 1 } }] } },
        { $unwind: { path: '$hackathon', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'teamapplications', localField: '_id', foreignField: 'teamRequestId', as: 'applications',
            pipeline: [{ $match: { status: 'PENDING' } }, { $count: 'n' }] } },
        { $addFields: { pendingApplicationCount: { $ifNull: [{ $arrayElemAt: ['$applications.n', 0] }, 0] } } },
        { $project: { applications: 0 } },
      ],
      total: [{ $count: 'n' }],
    } },
  ]);
  const total = (result?.total?.[0]?.n as number) ?? 0;
  return { items: result?.items ?? [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
};

/** Browses all OPEN team requests with optional hackathonId / skill filters. */
export const browseTeamRequests = async (
  filters: { hackathonId?: string; skill?: string },
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;
  const match: Record<string, unknown> = { status: 'OPEN' };
  if (filters.hackathonId) match['hackathonId'] = new mongoose.Types.ObjectId(filters.hackathonId);
  if (filters.skill) match['skillsNeeded'] = { $regex: filters.skill, $options: 'i' };

  const [result] = await TeamRequest.aggregate([
    { $match: match },
    { $facet: {
      items: [
        { $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit },
        { $lookup: { from: 'hackathons', localField: 'hackathonId', foreignField: '_id', as: 'hackathon',
            pipeline: [{ $project: { name: 1, slug: 1, registrationDeadline: 1, domains: 1 } }] } },
        { $unwind: { path: '$hackathon', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'creatorId', foreignField: '_id', as: 'creator',
            pipeline: [{ $project: { fullName: 1, course: 1, yearOfStudy: 1, interestedDomains: 1 } }] } },
        { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      ],
      total: [{ $count: 'n' }],
    } },
  ]);
  const total = (result?.total?.[0]?.n as number) ?? 0;
  return { items: result?.items ?? [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
};

/** Applies to join a team. Validates applicant is not the creator and not a repeat applicant. */
export const applyToTeam = async (applicantId: string, requestId: string, message: string) => {
  if (!mongoose.isValidObjectId(requestId)) throw createError(400, 'Invalid request ID.');

  // Only verified students may apply to teams
  const applicantUser = await User.findById(applicantId).select('emailVerified fullName');
  if (!applicantUser?.emailVerified)
    throw createError(403, 'You must verify your email before applying to a team.');

  const teamRequest = await TeamRequest.findById(requestId).populate('hackathonId', 'name');
  if (!teamRequest || teamRequest.status !== 'OPEN')
    throw createError(404, 'Open team request not found.');

  if (teamRequest.creatorId.toString() === applicantId)
    throw createError(400, 'You cannot apply to your own team request.');

  const existing = await TeamApplication.findOne({ teamRequestId: requestId, applicantId });
  if (existing) throw createError(409, 'You have already applied to this team.');

  const application = await TeamApplication.create({
    teamRequestId: requestId,
    applicantId,
    message,
    status: 'PENDING',
  });

  // Notify the creator
  const hackathonName = (teamRequest.hackathonId as any)?.name ?? 'a hackathon';
  await Notification.create({
    userId: teamRequest.creatorId,
    type: 'team_application',
    title: `New team application from ${applicantUser.fullName}`,
    body: `Someone wants to join your team for ${hackathonName}. Review their application.`,
    relatedId: application._id,
  });

  return application.toObject();
};

/** Returns incoming applications for a team request (creator only). */
export const getIncomingApplications = async (
  creatorId: string,
  requestId: string,
  page: number,
  limit: number,
) => {
  if (!mongoose.isValidObjectId(requestId)) throw createError(400, 'Invalid request ID.');
  const teamRequest = await TeamRequest.findOne({ _id: requestId, creatorId });
  if (!teamRequest) throw createError(404, 'Team request not found.');

  const skip = (page - 1) * limit;
  const objectRequestId = new mongoose.Types.ObjectId(requestId);
  const [result] = await TeamApplication.aggregate([
    { $match: { teamRequestId: objectRequestId } },
    { $facet: {
      items: [
        { $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit },
        { $lookup: { from: 'users', localField: 'applicantId', foreignField: '_id', as: 'applicant',
            pipeline: [{ $project: { fullName: 1, email: 1, course: 1, yearOfStudy: 1, interestedDomains: 1 } }] } },
        { $unwind: { path: '$applicant', preserveNullAndEmptyArrays: true } },
      ],
      total: [{ $count: 'n' }],
    } },
  ]);
  const total = (result?.total?.[0]?.n as number) ?? 0;
  return { items: result?.items ?? [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

/** Accepts or rejects an application (creator only). */
export const respondToApplication = async (
  creatorId: string,
  applicationId: string,
  newStatus: 'ACCEPTED' | 'REJECTED',
) => {
  if (!mongoose.isValidObjectId(applicationId)) throw createError(400, 'Invalid application ID.');

  // Verify creator owns the team request
  const application = await TeamApplication.findById(applicationId).populate('teamRequestId');
  if (!application) throw createError(404, 'Application not found.');

  const teamRequest = application.teamRequestId as any;
  if (teamRequest.creatorId.toString() !== creatorId)
    throw createError(403, 'You do not own this team request.');

  application.status = newStatus;
  await application.save();

  // Notify the applicant
  const hackathon = await Hackathon.findById(teamRequest.hackathonId).select('name');
  await Notification.create({
    userId: application.applicantId,
    type: 'team_application_response',
    title: newStatus === 'ACCEPTED'
      ? `Your team application was accepted!`
      : `Your team application was not accepted`,
    body: newStatus === 'ACCEPTED'
      ? `You have been accepted to a team for ${hackathon?.name ?? 'a hackathon'}. Good luck!`
      : `Your application to ${hackathon?.name ?? 'a hackathon'} was not accepted this time.`,
    relatedId: application._id,
  });

  // If accepted: bump currentTeamSize, auto-close if full
  if (newStatus === 'ACCEPTED') {
    teamRequest.currentTeamSize = Math.min(teamRequest.currentTeamSize + 1, teamRequest.maxTeamSize);
    if (teamRequest.currentTeamSize >= teamRequest.maxTeamSize) {
      teamRequest.status = 'FULL';
    }
    await teamRequest.save();

    // Award TEAM_PLAYER achievement to both creator and applicant when they've done 3 teams
    await checkAndAwardAchievements(creatorId);
    await checkAndAwardAchievements(application.applicantId.toString());
  }

  return application.toObject();
};

/** Withdraws the applicant's own pending application. */
export const withdrawApplication = async (applicantId: string, applicationId: string) => {
  if (!mongoose.isValidObjectId(applicationId)) throw createError(400, 'Invalid application ID.');
  const application = await TeamApplication.findOneAndUpdate(
    { _id: applicationId, applicantId, status: 'PENDING' },
    { $set: { status: 'WITHDRAWN' } },
    { new: true },
  );
  if (!application) throw createError(404, 'Pending application not found.');
  return application.toObject();
};

/** Returns the applicant's sent applications, paginated. */
export const getMyApplications = async (applicantId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const objectApplicantId = new mongoose.Types.ObjectId(applicantId);
  const [result] = await TeamApplication.aggregate([
    { $match: { applicantId: objectApplicantId } },
    { $facet: {
      items: [
        { $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit },
        { $lookup: { from: 'teamrequests', localField: 'teamRequestId', foreignField: '_id', as: 'teamRequest',
            pipeline: [{ $project: { title: 1, hackathonId: 1, creatorId: 1, status: 1 } }] } },
        { $unwind: { path: '$teamRequest', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'hackathons', localField: 'teamRequest.hackathonId', foreignField: '_id', as: 'hackathon',
            pipeline: [{ $project: { name: 1, slug: 1 } }] } },
        { $unwind: { path: '$hackathon', preserveNullAndEmptyArrays: true } },
      ],
      total: [{ $count: 'n' }],
    } },
  ]);
  const total = (result?.total?.[0]?.n as number) ?? 0;
  return { items: result?.items ?? [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
};
