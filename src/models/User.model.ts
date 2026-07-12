import { Schema, model, type Document, type Types } from 'mongoose';
import { COLLECTIONS, ROLES, type UserRole } from '../types/enums.js';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.REPORTER,
      index: true,
    },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.USERS,
    toJSON: {
      transform(_doc, ret) {
        const value = ret as Record<string, unknown>;
        value.id = String(value._id);
        delete value._id;
        delete value.__v;
        delete value.passwordHash;
        delete value.passwordResetTokenHash;
        delete value.passwordResetExpiresAt;
        return value;
      },
    },
  },
);

export const UserModel = model<IUserDocument>('User', userSchema);
