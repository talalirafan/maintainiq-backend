import { Schema, model, type Document, type Types } from 'mongoose';
import { COLLECTIONS } from '../types/enums.js';

export interface IRefreshToken {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdByIp?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshTokenDocument extends IRefreshToken, Document {
  _id: Types.ObjectId;
}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    createdByIp: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.REFRESH_TOKENS,
  },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model<IRefreshTokenDocument>(
  'RefreshToken',
  refreshTokenSchema,
);
