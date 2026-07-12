import { Schema, model, type Document, type Types } from 'mongoose';
import {
  COLLECTIONS,
  ISSUE_PRIORITY,
  ISSUE_STATUS,
  type IssuePriority,
  type IssueStatus,
} from '../types/enums.js';

export interface IIssueEvidence {
  url: string;
  publicId?: string;
  resourceType: 'image' | 'video' | 'raw';
  mimeType?: string;
  originalName?: string;
  bytes?: number;
}

export interface IIssue {
  issueNumber: string;
  assetId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  status: IssueStatus;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  reportedById?: Types.ObjectId | null;
  assignedTechnicianId?: Types.ObjectId | null;
  evidence: IIssueEvidence[];
  resolutionNotes?: string;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  reopenedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIssueDocument extends IIssue, Document {
  _id: Types.ObjectId;
}

const evidenceSchema = new Schema<IIssueEvidence>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw'],
      required: true,
      default: 'image',
    },
    mimeType: { type: String },
    originalName: { type: String },
    bytes: { type: Number },
  },
  { _id: false },
);

const issueSchema = new Schema<IIssueDocument>(
  {
    issueNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      match: /^ISS-\d{6}$/,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200, index: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true, maxlength: 100, index: true },
    priority: {
      type: String,
      enum: Object.values(ISSUE_PRIORITY),
      required: true,
      default: ISSUE_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ISSUE_STATUS),
      required: true,
      default: ISSUE_STATUS.REPORTED,
      index: true,
    },
    reporterName: { type: String, required: true, trim: true, maxlength: 120 },
    reporterEmail: { type: String, required: true, lowercase: true, trim: true },
    reporterPhone: { type: String, trim: true },
    reportedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignedTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    evidence: { type: [evidenceSchema], default: [] },
    resolutionNotes: { type: String, trim: true, maxlength: 5000 },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    reopenedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.ISSUES,
    toJSON: {
      transform(_doc, ret) {
        const value = ret as Record<string, unknown>;
        value.id = String(value._id);
        delete value._id;
        delete value.__v;
        return value;
      },
    },
  },
);

issueSchema.index({ title: 'text', description: 'text', issueNumber: 'text', category: 'text' });

export const IssueModel = model<IIssueDocument>('Issue', issueSchema);
