import { z } from 'zod';
import { MAINTENANCE_STATUS } from '../models/MaintenanceRecord.model.js';

const mediaSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  resourceType: z.enum(['image', 'video', 'raw']),
  mimeType: z.string().optional(),
  originalName: z.string().optional(),
  bytes: z.number().optional(),
});

const partSchema = z.object({
  name: z.string().min(1).max(160),
  quantity: z.coerce.number().int().min(1).max(9999),
  unitCost: z.coerce.number().min(0).max(1_000_000).optional(),
});

export const startMaintenanceSchema = z.object({
  issueId: z.string().min(1),
});

export const updateMaintenanceSchema = z.object({
  inspectionNotes: z.string().max(8000).optional(),
  partsUsed: z.array(partSchema).max(50).optional(),
  cost: z.coerce.number().min(0).max(10_000_000).optional(),
  timeTakenMinutes: z.coerce.number().int().min(0).max(100_000).optional(),
  media: z.array(mediaSchema).max(20).optional(),
  aiSummary: z.string().max(8000).optional(),
  nextServiceDate: z.coerce.date().nullable().optional(),
});

export const completeMaintenanceSchema = z.object({
  inspectionNotes: z.string().min(10).max(8000),
  partsUsed: z.array(partSchema).max(50).default([]),
  cost: z.coerce.number().min(0).max(10_000_000).default(0),
  timeTakenMinutes: z.coerce.number().int().min(1).max(100_000),
  media: z.array(mediaSchema).max(20).default([]),
  aiSummary: z.string().max(8000).optional(),
  completionDate: z.coerce.date().optional(),
  nextServiceDate: z.coerce.date(),
  resolveIssue: z.boolean().default(true),
  resolutionNotes: z.string().max(5000).optional(),
});

export const listMaintenanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum([MAINTENANCE_STATUS.DRAFT, MAINTENANCE_STATUS.COMPLETED])
    .optional(),
  issueId: z.string().optional(),
  assetId: z.string().optional(),
  technicianId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'completionDate', 'recordNumber']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type StartMaintenanceInput = z.infer<typeof startMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type CompleteMaintenanceInput = z.infer<typeof completeMaintenanceSchema>;
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>;
