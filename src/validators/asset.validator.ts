import { z } from 'zod';
import { ASSET_CONDITION, ASSET_STATUS } from '../types/enums.js';

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date;
  });

export const createAssetSchema = z.object({
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(100),
  location: z.string().min(2).max(160),
  condition: z.enum([
    ASSET_CONDITION.EXCELLENT,
    ASSET_CONDITION.GOOD,
    ASSET_CONDITION.FAIR,
    ASSET_CONDITION.POOR,
    ASSET_CONDITION.CRITICAL,
  ]),
  status: z
    .enum([
      ASSET_STATUS.OPERATIONAL,
      ASSET_STATUS.ISSUE_REPORTED,
      ASSET_STATUS.INSPECTION,
      ASSET_STATUS.MAINTENANCE,
      ASSET_STATUS.OUT_OF_SERVICE,
      ASSET_STATUS.RETIRED,
    ])
    .default(ASSET_STATUS.OPERATIONAL),
  description: z.string().max(2000).optional(),
  assignedTechnicianId: z.string().min(1).nullable().optional(),
  lastServiceDate: optionalDate,
  nextServiceDate: optionalDate,
});

export const updateAssetSchema = createAssetSchema.partial();

export const assignTechnicianSchema = z.object({
  technicianId: z.string().min(1).nullable(),
});

export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum([
      ASSET_STATUS.OPERATIONAL,
      ASSET_STATUS.ISSUE_REPORTED,
      ASSET_STATUS.INSPECTION,
      ASSET_STATUS.MAINTENANCE,
      ASSET_STATUS.OUT_OF_SERVICE,
      ASSET_STATUS.RETIRED,
    ])
    .optional(),
  condition: z
    .enum([
      ASSET_CONDITION.EXCELLENT,
      ASSET_CONDITION.GOOD,
      ASSET_CONDITION.FAIR,
      ASSET_CONDITION.POOR,
      ASSET_CONDITION.CRITICAL,
    ])
    .optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  technicianId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'nextServiceDate', 'assetCode', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
