import { Schema, model, type Document, type Types } from 'mongoose';
import {
  ASSET_CONDITION,
  ASSET_STATUS,
  COLLECTIONS,
  type AssetCondition,
  type AssetStatus,
} from '../types/enums.js';

export interface IAsset {
  assetCode: string;
  name: string;
  category: string;
  location: string;
  condition: AssetCondition;
  status: AssetStatus;
  description?: string;
  assignedTechnicianId?: Types.ObjectId | null;
  lastServiceDate?: Date | null;
  nextServiceDate?: Date | null;
  createdById: Types.ObjectId;
  updatedById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssetDocument extends IAsset, Document {
  _id: Types.ObjectId;
}

const assetSchema = new Schema<IAssetDocument>(
  {
    assetCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      match: /^AST-\d{6}$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 160, index: true },
    category: { type: String, required: true, trim: true, maxlength: 100, index: true },
    location: { type: String, required: true, trim: true, maxlength: 160, index: true },
    condition: {
      type: String,
      enum: Object.values(ASSET_CONDITION),
      required: true,
      default: ASSET_CONDITION.GOOD,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ASSET_STATUS),
      required: true,
      default: ASSET_STATUS.OPERATIONAL,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    assignedTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    lastServiceDate: { type: Date, default: null },
    nextServiceDate: { type: Date, default: null, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.ASSETS,
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

assetSchema.index({ name: 'text', assetCode: 'text', category: 'text', location: 'text' });

export const AssetModel = model<IAssetDocument>('Asset', assetSchema);
