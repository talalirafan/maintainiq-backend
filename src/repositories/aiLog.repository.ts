import { AiLogModel, type IAiLogDocument, type IAiTriageSuggestion } from '../models/AiLog.model.js';

export interface CreateAiLogInput {
  assetId: string;
  complaint: string;
  modelName: string;
  promptSummary: string;
  rawResponse?: string;
  suggestion: IAiTriageSuggestion;
  source: 'gemini' | 'fallback';
  requestedById?: string | null;
}

export class AiLogRepository {
  async create(input: CreateAiLogInput): Promise<IAiLogDocument> {
    return AiLogModel.create({
      ...input,
      confidence: input.suggestion.confidence,
      requestedById: input.requestedById ?? null,
    });
  }

  async findById(id: string): Promise<IAiLogDocument | null> {
    return AiLogModel.findById(id);
  }

  async markApplied(
    id: string,
    issueId: string,
    editedSuggestion: IAiTriageSuggestion,
  ): Promise<IAiLogDocument | null> {
    return AiLogModel.findByIdAndUpdate(
      id,
      {
        appliedIssueId: issueId,
        editedSuggestion,
      },
      { new: true },
    );
  }
}

export const aiLogRepository = new AiLogRepository();
