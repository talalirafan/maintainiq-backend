import { Types } from 'mongoose';
import { AssetHistoryModel, type IAssetHistoryDocument } from '../models/AssetHistory.model.js';
import type { HistoryEvent } from '../types/enums.js';

export interface AppendHistoryInput {
  assetId: string;
  event: HistoryEvent;
  title: string;
  description?: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface HistoryListFilters {
  search?: string;
  assetId?: string;
  event?: HistoryEvent;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

export class AssetHistoryRepository {
  async append(input: AppendHistoryInput): Promise<IAssetHistoryDocument> {
    return AssetHistoryModel.create({
      assetId: new Types.ObjectId(input.assetId),
      event: input.event,
      title: input.title,
      description: input.description,
      actorId: input.actorId ? new Types.ObjectId(input.actorId) : null,
      metadata: input.metadata,
    });
  }

  async listByAsset(assetId: string, limit = 50): Promise<IAssetHistoryDocument[]> {
    return AssetHistoryModel.find({ assetId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actorId', 'name email role');
  }

  async list(
    filters: HistoryListFilters,
  ): Promise<{ items: IAssetHistoryDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.assetId) query.assetId = filters.assetId;
    if (filters.event) query.event = filters.event;

    if (filters.from || filters.to) {
      const createdAt: Record<string, Date> = {};
      if (filters.from) createdAt.$gte = filters.from;
      if (filters.to) createdAt.$lte = filters.to;
      query.createdAt = createdAt;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      createdAt: filters.sortOrder === 'asc' ? 1 : -1,
    };
    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      AssetHistoryModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .populate('assetId', 'assetCode name location category status')
        .populate('actorId', 'name email role'),
      AssetHistoryModel.countDocuments(query),
    ]);

    return { items, total };
  }

  async countByEvent(): Promise<Array<{ event: string; count: number }>> {
    const rows = await AssetHistoryModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return rows.map((row) => ({ event: row._id, count: row.count }));
  }
}

export const assetHistoryRepository = new AssetHistoryRepository();
