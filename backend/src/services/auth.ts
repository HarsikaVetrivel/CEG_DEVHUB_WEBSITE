import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { createError } from '../utils/errors.js';
import User, { USER_ROLES, type UserRole } from '../models/User.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { sendPasswordResetEmail } from './email.js';

const hashPassword = async (password: string) => bcrypt.hash(password, 12);

export const registerUser = async (input: {
  fullName: string;
  email: string;
  password: string;
}) => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createError(409, 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
    fullName: input.fullName.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'STUDENT' as UserRole,
  });

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };
};

export const findUserByEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const usernamePrefix = normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : normalizedEmail;
  return User.findOne({
    $or: [{ email: normalizedEmail }, { email: usernamePrefix }],
  }).select('+passwordHash');
};

export const findUserById = async (userId: string) => {
  return User.findById(userId);
};

export const updateProfile = async (
  userId: string,
  input: {
    fullName?: string;
    yearOfStudy?: number | null;
    course?: string | null;
    interestedDomains?: string[];
  },
) => {
  const user = await User.findById(userId);
  if (!user) throw createError(404, 'User not found.');

  if (input.fullName !== undefined) user.fullName = input.fullName.trim();
  if (input.yearOfStudy !== undefined) user.yearOfStudy = input.yearOfStudy ?? undefined;
  if (input.course !== undefined) user.course = input.course ?? undefined;
  if (input.interestedDomains !== undefined) user.interestedDomains = input.interestedDomains;

  await user.save();
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    yearOfStudy: user.yearOfStudy ?? null,
    course: user.course ?? null,
    interestedDomains: user.interestedDomains,
  };
};

export const changePassword = async (
  userId: string,
  input: { currentPassword: string; newPassword: string },
) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw createError(404, 'User not found.');

  const matches = await user.comparePassword(input.currentPassword);
  if (!matches) throw createError(401, 'Current password is incorrect.');

  user.passwordHash = await bcrypt.hash(input.newPassword, 12);
  await user.save();
  return true;
};

export const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, role: 'STUDENT' });

  // Always return success to prevent email enumeration attacks
  if (!user) return;

  // Invalidate any existing unused tokens for this user
  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

  // Generate a cryptographically random 48-byte token
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  await sendPasswordResetEmail(user.email, user.fullName, rawToken);
};

export const resetPassword = async (rawToken: string, newPassword: string) => {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw createError(400, 'This reset link is invalid or has expired. Please request a new one.');
  }

  const user = await User.findById(record.userId);
  if (!user) throw createError(404, 'User not found.');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Mark token as used so it can't be replayed
  record.usedAt = new Date();
  await record.save();

  return { email: user.email };
};

export const ensureAdminRole = (role: string | undefined) => {
  if (role !== 'ADMIN') {
    throw createError(403, 'You do not have permission to access this resource.');
  }
};

export const isAllowedRole = (role: string | undefined, allowedRoles: readonly UserRole[]) => {
  return role !== undefined && allowedRoles.includes(role as UserRole);
};

export const roleOptions = USER_ROLES;
