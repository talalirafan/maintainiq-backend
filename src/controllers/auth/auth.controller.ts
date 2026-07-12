import type { Response } from 'express';
import { authService } from '../../services/auth/auth.service.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
} from '../../validators/auth.validator.js';

function requestMeta(req: AuthenticatedRequest): { ip?: string; userAgent?: string } {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

export class AuthController {
  register = asyncHandler(async (req, res) => {
    const session = await authService.register(req.body as RegisterInput, requestMeta(req));
    sendSuccess(res, session, 201, 'Account created');
  });

  login = asyncHandler(async (req, res) => {
    const session = await authService.login(req.body as LoginInput, requestMeta(req));
    sendSuccess(res, session, 200, 'Signed in');
  });

  refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as RefreshInput;
    const session = await authService.refresh(refreshToken, requestMeta(req));
    sendSuccess(res, session, 200, 'Token refreshed');
  });

  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = (req.body ?? {}) as Partial<RefreshInput>;
    await authService.logout(refreshToken);
    sendSuccess(res, { ok: true }, 200, 'Signed out');
  });

  logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await authService.logoutAll(req.user!.id);
    sendSuccess(res, { ok: true }, 200, 'Signed out from all devices');
  });

  me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.me(req.user!.id);
    sendSuccess(res, user);
  });

  forgotPassword = asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body as ForgotPasswordInput);
    sendSuccess(res, result);
  });

  resetPassword = asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body as ResetPasswordInput);
    sendSuccess(res, result);
  });

  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.changePassword(
      req.user!.id,
      req.body as ChangePasswordInput,
    );
    sendSuccess(res, result);
  });
}

export const authController = new AuthController();
