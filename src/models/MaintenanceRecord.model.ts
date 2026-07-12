import { Schema, model, type Document, type Types } from 'mongoose';
import { COLLECTIONS } from '../types/enums.js';

export const MAINTENANCE_STATUS = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
} as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

export interface IMaintenancePart {
  name: string;
  quantity: number;
  unitCost?: number;
}

export interface IMaintenanceMedia {
  url: string;
  publicId?: string;
  resourceType: 'image' | 'video' | 'raw';
  mimeType?: string;
  originalName?: string;
  bytes?: number;
}

export interface IMaintenanceRecord {
  recordNumber: string;
  issueId: Types.ObjectId;
  assetId: Types.ObjectId;
  technicianId: Types.ObjectId;
  status: MaintenanceStatus;
  inspectionNotes: string;
  partsUsed: IMaintenancePart[];
  cost: number;
  timeTakenMinutes: number;
  media: IMaintenanceMedia[];
  aiSummary?: string;
  completionDate?: Date | null;
  nextServiceDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMaintenanceRecordDocument extends IMaintenanceRecord, Document {
  _id: Types.ObjectId;
}

const partSchema = new Schema<IMaintenancePart>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitCost: { type: Number, min: 0 },
  },
  { _id: false },
);

const mediaSchema = new Schema<IMaintenanceMedia>(
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

const maintenanceRecordSchema = new Schema<IMaintenanceRecordDocument>(
  {
    recordNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      match: /^MNT-\d{6}$/,
    },
    issueId: {
      type: Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MAINTENANCE_STATUS),
      required: true,
      default: MAINTENANCE_STATUS.DRAFT,
      index: true,
    },
    inspectionNotes: { type: String, default: '', trim: true, maxlength: 8000 },
    partsUsed: { type: [partSchema], default: [] },
    cost: { type: Number, default: 0, min: 0 },
    timeTakenMinutes: { type: Number, default: 0, min: 0 },
    media: { type: [mediaSchema], default: [] },
    aiSummary: { type: String, trim: true, maxlength: 8000 },
    completionDate: { type: Date, default: null },
    nextServiceDate: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.MAINTENANCE_RECORDS,
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

maintenanceRecordSchema.index({ issueId: 1, status: 1 });

export const MaintenanceRecordModel = model<IMaintenanceRecordDocument>(
  'MaintenanceRecord',
  maintenanceRecordSchema,
);
