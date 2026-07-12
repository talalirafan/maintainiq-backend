import { Types } from 'mongoose';
import { RefreshTokenModel, type IRefreshTokenDocument } from '../models/RefreshToken.model.js';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdByIp?: string;
  userAgent?: string;
}

export class RefreshTokenRepository {
  async create(input: CreateRefreshTokenInput): Promise<IRefreshTokenDocument> {
    return RefreshTokenModel.create({
      userId: new Types.ObjectId(input.userId),
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdByIp: input.createdByIp,
      userAgent: input.userAgent,
    });
  }

  async findValidByHash(tokenHash: string): Promise<IRefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
