import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { assetHistoryRepository } from '../../repositories/assetHistory.repository.js';
import { assetRepository } from '../../repositories/asset.repository.js';
import { aiLogRepository } from '../../repositories/aiLog.repository.js';
import { issueRepository } from '../../repositories/issue.repository.js';
import { ISSUE_PRIORITY, type IssuePriority } from '../../types/enums.js';
import { AppError } from '../../utils/AppError.js';
import {
  aiSuggestionSchema,
  type AiSuggestion,
  type MaintenanceSummaryRequestInput,
} from '../../validators/ai.validator.js';

export interface TriageResult {
  aiLogId: string;
  suggestion: AiSuggestion;
  source: 'gemini' | 'fallback';
  mustEditBeforeSave: true;
  context: {
    assetCode: string;
    assetName: string;
    location: string;
    condition: string;
    previousIssueCount: number;
  };
}

function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function heuristicTriage(input: {
  complaint: string;
  categoryHint?: string;
  previousIssueCount: number;
}): AiSuggestion {
  const text = input.complaint.toLowerCase();
  let priority: IssuePriority = ISSUE_PRIORITY.MEDIUM;
  let category = input.categoryHint ?? 'Other';

  if (/(smoke|fire|spark|shock|gas|leak|unsafe|injury)/.test(text)) {
    priority = ISSUE_PRIORITY.CRITICAL;
    category = 'Safety';
  } else if (/(overheat|burning|smell|power|electric)/.test(text)) {
    priority = ISSUE_PRIORITY.HIGH;
    category = 'Electrical';
  } else if (/(noise|vibration|jam|broken|mechanical)/.test(text)) {
    priority = ISSUE_PRIORITY.HIGH;
    category = 'Mechanical';
  } else if (/(software|error|screen|firmware)/.test(text)) {
    priority = ISSUE_PRIORITY.MEDIUM;
    category = 'Software';
  }

  const title =
    input.complaint.trim().length > 80
      ? `${input.complaint.trim().slice(0, 77)}...`
      : input.complaint.trim();

  return {
    title,
    category,
    priority,
    possibleCauses: [
      'Normal wear or delayed servicing',
      'Operator handling or configuration issue',
      'Environmental stress at the asset location',
    ],
    initialChecks: [
      'Confirm the asset is safely powered down if required',
      'Visually inspect for damage, leaks, or loose parts',
      'Compare against the last successful service notes',
    ],
    safetyWarnings: [
      'Do not bypass safety interlocks',
      'Keep bystanders clear until inspected by a technician',
    ],
    recurringPattern:
      input.previousIssueCount > 1
        ? `This asset has ${input.previousIssueCount} prior issues — check for a recurring root cause.`
        : 'No strong recurring pattern detected from prior issues.',
    confidence: 0.42,
  };
}

export class AiService {
  async triage(input: {
    assetId: string;
    complaint: string;
    requestedById?: string | null;
  }): Promise<TriageResult> {
    const asset = await assetRepository.findById(input.assetId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    const [history, previousIssues] = await Promise.all([
      assetHistoryRepository.listByAsset(input.assetId, 12),
      issueRepository.list({
        assetId: input.assetId,
        page: 1,
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    ]);

    const context = {
      assetCode: asset.assetCode,
      assetName: asset.name,
      category: asset.category,
      location: asset.location,
      condition: asset.condition,
      status: asset.status,
      lastServiceDate: asset.lastServiceDate,
      nextServiceDate: asset.nextServiceDate,
      history: history.map((item) => ({
        event: item.event,
        title: item.title,
        createdAt: item.createdAt,
      })),
      previousIssues: previousIssues.items.map((issue) => ({
        issueNumber: issue.issueNumber,
        title: issue.title,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
      })),
    };

    const promptSummary = `Triage complaint for ${asset.assetCode} at ${asset.location}`;

    let suggestion: AiSuggestion;
    let source: 'gemini' | 'fallback' = 'fallback';
    let rawResponse: string | undefined;
    let modelName = 'heuristic-fallback';

    if (env.gemini.apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(env.gemini.apiKey);
        const model = genAI.getGenerativeModel({
          model: env.gemini.model,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        const prompt = `
You are MaintainIQ, an industrial maintenance triage assistant.
Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "category": string,
  "priority": "low" | "medium" | "high" | "critical",
  "possibleCauses": string[],
  "initialChecks": string[],
  "safetyWarnings": string[],
  "recurringPattern": string,
  "confidence": number
}

Rules:
- Be concise and operational.
- Prefer safety-first guidance.
- confidence must be between 0 and 1.
- category should be one of: Mechanical, Electrical, Software, Safety, Hygiene, Other when possible.

Asset context:
${JSON.stringify(context, null, 2)}

Complaint:
${input.complaint}
`.trim();

        const result = await model.generateContent(prompt);
        rawResponse = result.response.text();
        const parsed = aiSuggestionSchema.parse(extractJson(rawResponse));
        suggestion = parsed;
        source = 'gemini';
        modelName = env.gemini.model;
      } catch (error) {
        console.warn('[ai] Gemini triage failed, using fallback', error);
        suggestion = heuristicTriage({
          complaint: input.complaint,
          categoryHint: asset.category,
          previousIssueCount: previousIssues.total,
        });
      }
    } else {
      suggestion = heuristicTriage({
        complaint: input.complaint,
        categoryHint: asset.category,
        previousIssueCount: previousIssues.total,
      });
    }

    const log = await aiLogRepository.create({
      assetId: input.assetId,
      complaint: input.complaint,
      modelName: modelName,
      promptSummary,
      rawResponse,
      suggestion,
      source,
      requestedById: input.requestedById ?? null,
    });

    return {
      aiLogId: String(log._id),
      suggestion,
      source,
      mustEditBeforeSave: true,
      context: {
        assetCode: asset.assetCode,
        assetName: asset.name,
        location: asset.location,
        condition: asset.condition,
        previousIssueCount: previousIssues.total,
      },
    };
  }

  async markApplied(
    aiLogId: string,
    issueId: string,
    editedSuggestion: AiSuggestion,
  ): Promise<void> {
    const existing = await aiLogRepository.findById(aiLogId);
    if (!existing) {
      throw new AppError('AI log not found', 404);
    }

    // Enforce edit-before-save: edited payload must differ from original suggestion
    const original = JSON.stringify(existing.suggestion);
    const edited = JSON.stringify(editedSuggestion);
    if (original === edited) {
      throw new AppError(
        'AI suggestion must be reviewed and edited before saving the issue',
        400,
      );
    }

    await aiLogRepository.markApplied(aiLogId, issueId, editedSuggestion);
  }

  async maintenanceSummary(input: MaintenanceSummaryRequestInput): Promise<{
    summary: string;
    source: 'gemini' | 'fallback';
  }> {
    const issue = await issueRepository.findById(input.issueId);
    if (!issue) throw new AppError('Issue not found', 404);

    const assetId =
      issue.assetId && typeof issue.assetId === 'object' && '_id' in issue.assetId
        ? String((issue.assetId as { _id: { toString(): string } })._id)
        : String(issue.assetId);

    const asset = await assetRepository.findById(assetId);
    if (!asset) throw new AppError('Asset not found', 404);

    const partsLine =
      input.partsUsed.length > 0
        ? input.partsUsed
            .map(
              (part) =>
                `${part.name} × ${part.quantity}${
                  part.unitCost != null ? ` (unit ${part.unitCost})` : ''
                }`,
            )
            .join('; ')
        : 'None recorded';

    const fallback = [
      `Service report for ${asset.assetCode} (${asset.name}).`,
      `Issue ${issue.issueNumber}: ${issue.title}.`,
      `Inspection notes: ${input.inspectionNotes.trim()}`,
      `Parts used: ${partsLine}.`,
      input.timeTakenMinutes != null
        ? `Time on site: ${input.timeTakenMinutes} minutes.`
        : null,
      input.cost != null ? `Recorded cost: ${input.cost}.` : null,
      'Asset returned to service pending supervisor review of next service date.',
    ]
      .filter(Boolean)
      .join(' ');

    if (!env.gemini.apiKey) {
      return { summary: fallback, source: 'fallback' };
    }

    try {
      const genAI = new GoogleGenerativeAI(env.gemini.apiKey);
      const model = genAI.getGenerativeModel({
        model: env.gemini.model,
        generationConfig: { temperature: 0.3 },
      });

      const prompt = `
You are MaintainIQ. Rewrite technician field notes into a concise professional service report.
Return plain text only (no markdown headings). 2-4 short paragraphs.
Include: work performed, parts, outcome, and any follow-up recommendation.

Asset: ${asset.assetCode} — ${asset.name} @ ${asset.location}
Issue: ${issue.issueNumber} — ${issue.title}
Notes: ${input.inspectionNotes}
Parts: ${partsLine}
Time minutes: ${input.timeTakenMinutes ?? 'n/a'}
Cost: ${input.cost ?? 'n/a'}
`.trim();

      const result = await model.generateContent(prompt);
      const summary = result.response.text().trim();
      if (!summary) return { summary: fallback, source: 'fallback' };
      return { summary, source: 'gemini' };
    } catch (error) {
      console.warn('[ai] Gemini maintenance summary failed, using fallback', error);
      return { summary: fallback, source: 'fallback' };
    }
  }
}

export const aiService = new AiService();
