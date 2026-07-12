import type { Response } from 'express';
import { userService } from '../../services/users/user.service.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateProfileInput,
  UpdateUserInput,
} from '../../validators/user.validator.js';

export class UserController {
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await userService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    sendSuccess(res, user, 200, 'Profile updated');
  });

  list = asyncHandler(async (req, res) => {
    const result = await userService.listUsers(req.query as unknown as ListUsersQuery);
    sendSuccess(res, result);
  });

  create = asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body as CreateUserInput);
    sendSuccess(res, user, 201, 'User created');
  });

  getById = asyncHandler(async (req, res) => {
    const user = await userService.getUser(String(req.params.id));
    sendSuccess(res, user);
  });

  updateById = asyncHandler(async (req, res) => {
    const user = await userService.updateUser(String(req.params.id), req.body as UpdateUserInput);
    sendSuccess(res, user, 200, 'User updated');
  });
}

export const userController = new UserController();
