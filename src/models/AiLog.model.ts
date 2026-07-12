import { Schema, model, type Document, type Types } from 'mongoose';
import { COLLECTIONS, ISSUE_PRIORITY, type IssuePriority } from '../types/enums.js';

export interface IAiTriageSuggestion {
  title: string;
  category: string;
  priority: IssuePriority;
  possibleCauses: string[];
  initialChecks: string[];
  safetyWarnings: string[];
  recurringPattern: string;
  confidence: number;
}

export interface IAiLog {
  assetId: Types.ObjectId;
  complaint: string;
  modelName: string;
  promptSummary: string;
  rawResponse?: string;
  suggestion: IAiTriageSuggestion;
  editedSuggestion?: IAiTriageSuggestion | null;
  confidence: number;
  source: 'gemini' | 'fallback';
  appliedIssueId?: Types.ObjectId | null;
  requestedById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiLogDocument extends IAiLog, Document {
  _id: Types.ObjectId;
}

const suggestionSchema = new Schema<IAiTriageSuggestion>(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    priority: {
      type: String,
      enum: Object.values(ISSUE_PRIORITY),
      required: true,
    },
    possibleCauses: { type: [String], default: [] },
    initialChecks: { type: [String], default: [] },
    safetyWarnings: { type: [String], default: [] },
    recurringPattern: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, required: true },
  },
  { _id: false },
);

const aiLogSchema = new Schema<IAiLogDocument>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    complaint: { type: String, required: true, maxlength: 5000 },
    modelName: { type: String, required: true },
    promptSummary: { type: String, required: true },
    rawResponse: { type: String },
    suggestion: { type: suggestionSchema, required: true },
    editedSuggestion: { type: suggestionSchema, default: null },
    confidence: { type: Number, min: 0, max: 1, required: true },
    source: { type: String, enum: ['gemini', 'fallback'], required: true },
    appliedIssueId: { type: Schema.Types.ObjectId, ref: 'Issue', default: null },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.AI_LOGS,
  },
);

export const AiLogModel = model<IAiLogDocument>('AiLog', aiLogSchema);
