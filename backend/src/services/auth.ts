import bcrypt from 'bcryptjs';

import { createError } from '../utils/errors.js';
import User, { USER_ROLES, type UserRole } from '../models/User.js';

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
  return User.findOne({ email: normalizedEmail }).select('+passwordHash');
};

export const findUserById = async (userId: string) => {
  return User.findById(userId);
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
