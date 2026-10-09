import bcrypt from 'bcryptjs';
import mongoose, { type Model, type Document } from 'mongoose';

const reminderPreferencesSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    daysBefore: { type: [Number], default: [7, 3, 1] },
    timeZone: { type: String, default: 'Asia/Kolkata', maxlength: 100 },
  },
  { _id: false },
);

export const USER_ROLES = ['STUDENT', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  reminderPreferences: {
    enabled: boolean;
    daysBefore: number[];
    timeZone: string;
  };
  lastLoginAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'STUDENT',
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    reminderPreferences: {
      type: reminderPreferencesSchema,
      default: () => ({}),
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.comparePassword = async function comparePassword(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model<IUser, UserModel>('User', userSchema);

export default User;
