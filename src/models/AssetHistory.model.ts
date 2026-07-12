import { Schema, model, type Document, type Types } from 'mongoose';
import { COLLECTIONS, HISTORY_EVENT, type HistoryEvent } from '../types/enums.js';

export interface IAssetHistory {
  assetId: Types.ObjectId;
  event: HistoryEvent;
  title: string;
  description?: string;
  actorId?: Types.ObjectId | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAssetHistoryDocument extends IAssetHistory, Document {
  _id: Types.ObjectId;
}

const assetHistorySchema = new Schema<IAssetHistoryDocument>(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    event: {
      type: String,
      enum: Object.values(HISTORY_EVENT),
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: COLLECTIONS.ASSET_HISTORY,
    // History is append-only — no updates allowed at application layer
  },
);

export const AssetHistoryModel = model<IAssetHistoryDocument>('AssetHistory', assetHistorySchema);
