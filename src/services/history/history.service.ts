import type { IAssetHistoryDocument } from '../../models/AssetHistory.model.js';
import { assetHistoryRepository } from '../../repositories/assetHistory.repository.js';
import { assetRepository } from '../../repositories/asset.repository.js';
import type { PaginatedResult } from '../../types/api.js';
import { HISTORY_EVENT, type HistoryEvent } from '../../types/enums.js';
import { AppError } from '../../utils/AppError.js';
import type { ListHistoryQuery } from '../../validators/history.validator.js';

export interface HistoryActorSummary {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface HistoryAssetSummary {
  id: string;
  assetCode: string;
  name: string;
  location?: string;
  category?: string;
  status?: string;
}

export interface PublicHistoryItem {
  id: string;
  event: HistoryEvent;
  title: string;
  description?: string;
  asset: HistoryAssetSummary;
  actor?: HistoryActorSummary | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

function asActor(value: unknown): HistoryActorSummary | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as {
    _id?: { toString(): string };
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  const id = record.id ?? record._id?.toString();
  if (!id || !record.name || !record.email || !record.role) return null;
  return { id, name: record.name, email: record.email, role: record.role };
}

function asAsset(value: unknown, fallbackId?: string): HistoryAssetSummary {
  if (value && typeof value === 'object' && 'assetCode' in value) {
    const record = value as {
      _id?: { toString(): string };
      id?: string;
      assetCode: string;
      name: string;
      location?: string;
      category?: string;
      status?: string;
    };
    return {
      id: record.id ?? record._id?.toString() ?? fallbackId ?? '',
      assetCode: record.assetCode,
      name: record.name,
      location: record.location,
      category: record.category,
      status: record.status,
    };
  }

  return {
    id: fallbackId ?? String(value),
    assetCode: 'UNKNOWN',
    name: 'Unknown asset',
  };
}

function toPublic(row: IAssetHistoryDocument): PublicHistoryItem {
  return {
    id: String(row._id),
    event: row.event,
    title: row.title,
    description: row.description,
    asset: asAsset(row.assetId),
    actor: asActor(row.actorId),
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export class HistoryService {
  async list(query: ListHistoryQuery): Promise<PaginatedResult<PublicHistoryItem>> {
    if (query.assetId) {
      const asset = await assetRepository.findById(query.assetId);
      if (!asset) throw new AppError('Asset not found', 404);
    }

    const { items, total } = await assetHistoryRepository.list({
      search: query.search,
      assetId: query.assetId,
      event: query.event,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });

    return {
      items: items.map(toPublic),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async listByAsset(
    assetId: string,
    query: Omit<ListHistoryQuery, 'assetId'>,
  ): Promise<PaginatedResult<PublicHistoryItem>> {
    return this.list({ ...query, assetId });
  }

  async eventSummary(): Promise<{
    events: Array<{ event: HistoryEvent; label: string; count: number }>;
    total: number;
  }> {
    const counts = await assetHistoryRepository.countByEvent();
    const countMap = new Map(counts.map((row) => [row.event, row.count]));
    const labels: Record<HistoryEvent, string> = {
      [HISTORY_EVENT.ASSET_CREATED]: 'Asset created',
      [HISTORY_EVENT.ASSET_UPDATED]: 'Asset updated',
      [HISTORY_EVENT.ISSUE_REPORTED]: 'Issue reported',
      [HISTORY_EVENT.ASSIGNED]: 'Assigned',
      [HISTORY_EVENT.INSPECTION_STARTED]: 'Inspection started',
      [HISTORY_EVENT.MAINTENANCE_STARTED]: 'Maintenance',
      [HISTORY_EVENT.PART_REPLACED]: 'Part replaced',
      [HISTORY_EVENT.RESOLVED]: 'Resolved',
      [HISTORY_EVENT.REOPENED]: 'Reopened',
      [HISTORY_EVENT.RETIRED]: 'Retired',
    };

    const events = (Object.values(HISTORY_EVENT) as HistoryEvent[]).map((event) => ({
      event,
      label: labels[event],
      count: countMap.get(event) ?? 0,
    }));

    return {
      events,
      total: events.reduce((sum, item) => sum + item.count, 0),
    };
  }
}

export const historyService = new HistoryService();
