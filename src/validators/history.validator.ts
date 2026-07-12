import { z } from 'zod';
import { HISTORY_EVENT } from '../types/enums.js';

const historyEventEnum = z.enum([
  HISTORY_EVENT.ASSET_CREATED,
  HISTORY_EVENT.ASSET_UPDATED,
  HISTORY_EVENT.ISSUE_REPORTED,
  HISTORY_EVENT.ASSIGNED,
  HISTORY_EVENT.INSPECTION_STARTED,
  HISTORY_EVENT.MAINTENANCE_STARTED,
  HISTORY_EVENT.PART_REPLACED,
  HISTORY_EVENT.RESOLVED,
  HISTORY_EVENT.REOPENED,
  HISTORY_EVENT.RETIRED,
]);

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  assetId: z.string().optional(),
  event: historyEventEnum.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListHistoryQuery = z.infer<typeof listHistoryQuerySchema>;
