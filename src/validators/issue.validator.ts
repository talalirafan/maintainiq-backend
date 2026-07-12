import { z } from 'zod';
import { ISSUE_PRIORITY, ISSUE_STATUS } from '../types/enums.js';
import { aiSuggestionSchema } from './ai.validator.js';

const evidenceItemSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
  mimeType: z.string().optional(),
  originalName: z.string().optional(),
  bytes: z.number().optional(),
});

export const createIssueSchema = z.object({
  assetId: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(2).max(100),
  priority: z
    .enum([
      ISSUE_PRIORITY.LOW,
      ISSUE_PRIORITY.MEDIUM,
      ISSUE_PRIORITY.HIGH,
      ISSUE_PRIORITY.CRITICAL,
    ])
    .default(ISSUE_PRIORITY.MEDIUM),
  reporterName: z.string().min(2).max(120).optional(),
  reporterEmail: z.string().email().optional(),
  reporterPhone: z.string().min(7).max(20).optional(),
  assignedTechnicianId: z.string().min(1).nullable().optional(),
  evidence: z.array(evidenceItemSchema).max(10).optional(),
  aiLogId: z.string().min(1).optional(),
  editedAiSuggestion: aiSuggestionSchema.optional(),
});

export const publicCreateIssueSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(2).max(100),
  priority: z
    .enum([
      ISSUE_PRIORITY.LOW,
      ISSUE_PRIORITY.MEDIUM,
      ISSUE_PRIORITY.HIGH,
      ISSUE_PRIORITY.CRITICAL,
    ])
    .default(ISSUE_PRIORITY.MEDIUM),
  reporterName: z.string().min(2).max(120),
  reporterEmail: z.string().email(),
  reporterPhone: z.string().min(7).max(20).optional(),
  evidence: z.array(evidenceItemSchema).max(10).optional(),
  aiLogId: z.string().min(1).optional(),
  editedAiSuggestion: aiSuggestionSchema.optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.string().min(2).max(100).optional(),
  priority: z
    .enum([
      ISSUE_PRIORITY.LOW,
      ISSUE_PRIORITY.MEDIUM,
      ISSUE_PRIORITY.HIGH,
      ISSUE_PRIORITY.CRITICAL,
    ])
    .optional(),
  evidence: z.array(evidenceItemSchema).max(10).optional(),
});

export const assignIssueSchema = z.object({
  technicianId: z.string().min(1),
});

export const transitionIssueSchema = z.object({
  status: z.enum([
    ISSUE_STATUS.ASSIGNED,
    ISSUE_STATUS.INSPECTION_STARTED,
    ISSUE_STATUS.MAINTENANCE,
    ISSUE_STATUS.WAITING_PARTS,
    ISSUE_STATUS.RESOLVED,
    ISSUE_STATUS.CLOSED,
    ISSUE_STATUS.REOPENED,
  ]),
  notes: z.string().max(5000).optional(),
});

export const resolveIssueSchema = z.object({
  resolutionNotes: z.string().min(3).max(5000),
});

export const reopenIssueSchema = z.object({
  notes: z.string().max(5000).optional(),
});

export const listIssuesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum([
      ISSUE_STATUS.REPORTED,
      ISSUE_STATUS.ASSIGNED,
      ISSUE_STATUS.INSPECTION_STARTED,
      ISSUE_STATUS.MAINTENANCE,
      ISSUE_STATUS.WAITING_PARTS,
      ISSUE_STATUS.RESOLVED,
      ISSUE_STATUS.CLOSED,
      ISSUE_STATUS.REOPENED,
    ])
    .optional(),
  priority: z
    .enum([
      ISSUE_PRIORITY.LOW,
      ISSUE_PRIORITY.MEDIUM,
      ISSUE_PRIORITY.HIGH,
      ISSUE_PRIORITY.CRITICAL,
    ])
    .optional(),
  category: z.string().optional(),
  assetId: z.string().optional(),
  technicianId: z.string().optional(),
  openOnly: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => value === true || value === 'true'),
  sortBy: z.enum(['createdAt', 'priority', 'status', 'issueNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type PublicCreateIssueInput = z.infer<typeof publicCreateIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type AssignIssueInput = z.infer<typeof assignIssueSchema>;
export type TransitionIssueInput = z.infer<typeof transitionIssueSchema>;
export type ResolveIssueInput = z.infer<typeof resolveIssueSchema>;
export type ReopenIssueInput = z.infer<typeof reopenIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
