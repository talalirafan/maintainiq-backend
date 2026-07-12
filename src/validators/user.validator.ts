import { z } from 'zod';
import { ROLES } from '../types/enums.js';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).nullable().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
  role: z.enum([
    ROLES.ADMINISTRATOR,
    ROLES.TECHNICIAN,
    ROLES.REPORTER,
    ROLES.SUPERVISOR,
  ]),
  phone: z.string().min(7).max(20).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).nullable().optional(),
  role: z
    .enum([ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.REPORTER, ROLES.SUPERVISOR])
    .optional(),
  isActive: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z
    .enum([ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.REPORTER, ROLES.SUPERVISOR])
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
