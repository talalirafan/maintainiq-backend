import type { IUserDocument } from '../../models/User.model.js';
import { refreshTokenRepository } from '../../repositories/refreshToken.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import type { AuthUserPayload } from '../../types/api.js';
import { ROLES, type UserRole } from '../../types/enums.js';
import { AppError } from '../../utils/AppError.js';
import {
  getRefreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { generateOpaqueToken, hashToken } from '../../utils/tokenHash.js';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../../validators/auth.validator.js';
import { env } from '../../config/env.js';
import { mailService } from '../email/mail.service.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession extends AuthTokens {
  user: PublicUser;
}

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

function toPayload(user: IUserDocument): AuthUserPayload {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
  };
}

export class AuthService {
  async register(
    input: RegisterInput,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthSession> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      phone: input.phone,
    });

    return this.issueSession(user, meta);
  }

  async login(
    input: LoginInput,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthSession> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated', 403);
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    await userRepository.updateById(String(user._id), { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();

    return this.issueSession(user, meta);
  }

  async refresh(
    refreshToken: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthSession> {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const stored = await refreshTokenRepository.findValidByHash(tokenHash);

    if (!stored || String(stored.userId) !== payload.id) {
      throw new AppError('Refresh token is invalid or revoked', 401);
    }

    const user = await userRepository.findById(payload.id);
    if (!user || !user.isActive) {
      throw new AppError('Account is inactive or does not exist', 401);
    }

    await refreshTokenRepository.revokeByHash(tokenHash);
    return this.issueSession(user, meta);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await refreshTokenRepository.revokeByHash(hashToken(refreshToken));
  }

  async logoutAll(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return toPublicUser(user);
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(input.email);
    const genericMessage =
      'If an account exists for that email, password reset instructions have been sent.';

    if (!user || !user.isActive) {
      return { message: genericMessage };
    }

    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await userRepository.updateById(String(user._id), {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    });

    const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;

    await mailService.send({
      to: user.email,
      subject: 'Reset your MaintainIQ password',
      text: `Reset your password using this link (valid for 1 hour):\n\n${resetUrl}\n`,
      html: `<p>Reset your password using this link (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return { message: genericMessage };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const user = await userRepository.findByResetTokenHash(hashToken(input.token));
    if (!user) {
      throw new AppError('Reset token is invalid or expired', 400);
    }

    const passwordHash = await hashPassword(input.password);
    await userRepository.updateById(String(user._id), {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    await refreshTokenRepository.revokeAllForUser(String(user._id));

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<{ message: string }> {
    const user = await userRepository.findByIdWithSecrets(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.updateById(userId, { passwordHash });
    await refreshTokenRepository.revokeAllForUser(userId);

    return { message: 'Password updated successfully. Please sign in again.' };
  }

  async ensureBootstrapAdmin(): Promise<void> {
    const count = await userRepository.count();
    if (count > 0) return;

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@maintainiq.local';
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin123!';
    const name = process.env.BOOTSTRAP_ADMIN_NAME ?? 'MaintainIQ Admin';

    await userRepository.create({
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: ROLES.ADMINISTRATOR,
    });

    console.info(`[auth] Bootstrap admin created: ${email}`);
  }

  private async issueSession(
    user: IUserDocument,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthSession> {
    const payload = toPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await refreshTokenRepository.create({
      userId: String(user._id),
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshExpiryDate(),
      createdByIp: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
