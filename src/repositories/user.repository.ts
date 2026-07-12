import { UserModel, type IUserDocument } from '../models/User.model.js';
import type { UserRole } from '../types/enums.js';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
  passwordHash?: string;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  lastLoginAt?: Date | null;
}

export class UserRepository {
  async create(input: CreateUserInput): Promise<IUserDocument> {
    return UserModel.create(input);
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id);
  }

  async findByIdWithSecrets(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id).select(
      '+passwordHash +passwordResetTokenHash +passwordResetExpiresAt',
    );
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  }

  async findByResetTokenHash(tokenHash: string): Promise<IUserDocument | null> {
    return UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');
  }

  async updateById(id: string, input: UpdateUserInput): Promise<IUserDocument | null> {
    return UserModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  }

  async list(filters: {
    search?: string;
    role?: UserRole;
    page: number;
    limit: number;
  }): Promise<{ items: IUserDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit),
      UserModel.countDocuments(query),
    ]);

    return { items, total };
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }
}

export const userRepository = new UserRepository();
