import { z } from 'zod';
import { ISSUE_PRIORITY } from '../types/enums.js';

export const aiSuggestionSchema = z.object({
  title: z.string().min(3).max(200),
  category: z.string().min(2).max(100),
  priority: z.enum([
    ISSUE_PRIORITY.LOW,
    ISSUE_PRIORITY.MEDIUM,
    ISSUE_PRIORITY.HIGH,
    ISSUE_PRIORITY.CRITICAL,
  ]),
  possibleCauses: z.array(z.string().min(1)).min(1).max(8),
  initialChecks: z.array(z.string().min(1)).min(1).max(8),
  safetyWarnings: z.array(z.string().min(1)).min(1).max(8),
  recurringPattern: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const triageRequestSchema = z.object({
  assetId: z.string().min(1),
  complaint: z.string().min(10).max(5000),
});

export const publicTriageRequestSchema = z.object({
  complaint: z.string().min(10).max(5000),
});

export const applyAiSuggestionSchema = z.object({
  aiLogId: z.string().min(1),
  editedSuggestion: aiSuggestionSchema,
});

export const maintenanceSummaryRequestSchema = z.object({
  issueId: z.string().min(1),
  inspectionNotes: z.string().min(10).max(8000),
  partsUsed: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        quantity: z.coerce.number().int().min(1).max(9999),
        unitCost: z.coerce.number().min(0).optional(),
      }),
    )
    .max(50)
    .default([]),
  timeTakenMinutes: z.coerce.number().int().min(0).max(100_000).optional(),
  cost: z.coerce.number().min(0).optional(),
});

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;
export type TriageRequestInput = z.infer<typeof triageRequestSchema>;
export type PublicTriageRequestInput = z.infer<typeof publicTriageRequestSchema>;
export type ApplyAiSuggestionInput = z.infer<typeof applyAiSuggestionSchema>;
export type MaintenanceSummaryRequestInput = z.infer<typeof maintenanceSummaryRequestSchema>;
