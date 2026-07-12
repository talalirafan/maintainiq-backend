import { Router } from 'express';
import { userController } from '../controllers/users/user.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../types/enums.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateUserSchema,
} from '../validators/user.validator.js';

const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.patch('/me', validate(updateProfileSchema), userController.updateProfile);

usersRouter.get(
  '/',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR),
  validate(listUsersQuerySchema, 'query'),
  userController.list,
);

usersRouter.post(
  '/',
  authorize(ROLES.ADMINISTRATOR),
  validate(createUserSchema),
  userController.create,
);

usersRouter.get(
  '/:id',
  authorize(ROLES.ADMINISTRATOR, ROLES.SUPERVISOR),
  userController.getById,
);

usersRouter.patch(
  '/:id',
  authorize(ROLES.ADMINISTRATOR),
  validate(updateUserSchema),
  userController.updateById,
);

export default usersRouter;
