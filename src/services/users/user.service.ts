import { userRepository } from '../../repositories/user.repository.js';
import type { PaginatedResult } from '../../types/api.js';
import { AppError } from '../../utils/AppError.js';
import { hashPassword } from '../../utils/password.js';
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateProfileInput,
  UpdateUserInput,
} from '../../validators/user.validator.js';
import type { PublicUser } from '../auth/auth.service.js';
import type { IUserDocument } from '../../models/User.model.js';

function toPublicUser(user: IUserDocument): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class UserService {
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await userRepository.updateById(userId, {
      name: input.name,
      phone: input.phone,
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toPublicUser(user);
  }

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const user = await userRepository.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      role: input.role,
      phone: input.phone,
    });

    return toPublicUser(user);
  }

  async listUsers(query: ListUsersQuery): Promise<PaginatedResult<PublicUser>> {
    const { items, total } = await userRepository.list({
      search: query.search,
      role: query.role,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map(toPublicUser),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getUser(id: string): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return toPublicUser(user);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<PublicUser> {
    const user = await userRepository.updateById(id, input);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return toPublicUser(user);
  }
}

export const userService = new UserService();
