import { env } from '../../config/env.js';
import type { IAssetDocument } from '../../models/Asset.model.js';
import { assetHistoryRepository } from '../../repositories/assetHistory.repository.js';
import { assetRepository } from '../../repositories/asset.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import type { PaginatedResult } from '../../types/api.js';
import {
  ASSET_STATUS,
  HISTORY_EVENT,
  ROLES,
  type AssetCondition,
  type AssetStatus,
} from '../../types/enums.js';
import { AppError } from '../../utils/AppError.js';
import { buildPublicAssetUrl, formatAssetCode } from '../../utils/assetCode.js';
import type {
  AssignTechnicianInput,
  CreateAssetInput,
  ListAssetsQuery,
  UpdateAssetInput,
} from '../../validators/asset.validator.js';

export interface AssetTechnicianSummary {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PublicAsset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  location: string;
  condition: AssetCondition;
  status: AssetStatus;
  description?: string;
  assignedTechnician?: AssetTechnicianSummary | null;
  lastServiceDate?: Date | null;
  nextServiceDate?: Date | null;
  publicUrl: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetHistoryItem {
  id: string;
  event: string;
  title: string;
  description?: string;
  actor?: AssetTechnicianSummary | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

function asPopulatedUser(value: unknown): AssetTechnicianSummary | null {
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

function toPublicAsset(asset: IAssetDocument): PublicAsset {
  const id = String(asset._id);
  const createdBy =
    typeof asset.createdById === 'object' &&
    asset.createdById !== null &&
    '_id' in (asset.createdById as object)
      ? String((asset.createdById as { _id: { toString(): string } })._id)
      : String(asset.createdById);

  return {
    id,
    assetCode: asset.assetCode,
    name: asset.name,
    category: asset.category,
    location: asset.location,
    condition: asset.condition,
    status: asset.status,
    description: asset.description,
    assignedTechnician: asPopulatedUser(asset.assignedTechnicianId),
    lastServiceDate: asset.lastServiceDate,
    nextServiceDate: asset.nextServiceDate,
    publicUrl: buildPublicAssetUrl(env.publicAppUrl, id),
    createdById: createdBy,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export class AssetService {
  async create(input: CreateAssetInput, actorId: string): Promise<PublicAsset> {
    if (input.assignedTechnicianId) {
      await this.assertTechnician(input.assignedTechnicianId);
    }

    const sequence = await assetRepository.getNextAssetSequence();
    const asset = await assetRepository.create({
      assetCode: formatAssetCode(sequence),
      name: input.name,
      category: input.category,
      location: input.location,
      condition: input.condition,
      status: input.status,
      description: input.description,
      assignedTechnicianId: input.assignedTechnicianId ?? null,
      lastServiceDate: input.lastServiceDate ?? null,
      nextServiceDate: input.nextServiceDate ?? null,
      createdById: actorId,
    });

    await assetHistoryRepository.append({
      assetId: String(asset._id),
      event: HISTORY_EVENT.ASSET_CREATED,
      title: 'Asset created',
      description: `${asset.assetCode} · ${asset.name}`,
      actorId,
      metadata: { assetCode: asset.assetCode, status: asset.status },
    });

    if (input.assignedTechnicianId) {
      await assetHistoryRepository.append({
        assetId: String(asset._id),
        event: HISTORY_EVENT.ASSIGNED,
        title: 'Technician assigned',
        actorId,
        metadata: { technicianId: input.assignedTechnicianId },
      });
    }

    const hydrated = await assetRepository.findById(String(asset._id));
    return toPublicAsset(hydrated ?? asset);
  }

  async list(query: ListAssetsQuery): Promise<PaginatedResult<PublicAsset>> {
    const { items, total } = await assetRepository.list({
      search: query.search,
      status: query.status,
      condition: query.condition,
      category: query.category,
      location: query.location,
      technicianId: query.technicianId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: items.map(toPublicAsset),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getById(id: string): Promise<PublicAsset> {
    const asset = await assetRepository.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);
    return toPublicAsset(asset);
  }

  async update(id: string, input: UpdateAssetInput, actorId: string): Promise<PublicAsset> {
    const existing = await assetRepository.findById(id);
    if (!existing) throw new AppError('Asset not found', 404);

    if (input.assignedTechnicianId) {
      await this.assertTechnician(input.assignedTechnicianId);
    }

    const previousTechnicianId =
      existing.assignedTechnicianId && typeof existing.assignedTechnicianId === 'object'
        ? String(
            (existing.assignedTechnicianId as { _id?: { toString(): string } })._id ??
              existing.assignedTechnicianId,
          )
        : existing.assignedTechnicianId
          ? String(existing.assignedTechnicianId)
          : null;

    const updated = await assetRepository.updateById(id, {
      ...input,
      updatedById: actorId,
    });

    if (!updated) throw new AppError('Asset not found', 404);

    if (input.status === ASSET_STATUS.RETIRED && existing.status !== ASSET_STATUS.RETIRED) {
      await assetHistoryRepository.append({
        assetId: id,
        event: HISTORY_EVENT.RETIRED,
        title: 'Asset retired',
        actorId,
      });
    } else {
      await assetHistoryRepository.append({
        assetId: id,
        event: HISTORY_EVENT.ASSET_UPDATED,
        title: 'Asset updated',
        description: 'Asset details were updated',
        actorId,
        metadata: { changes: Object.keys(input) },
      });
    }

    if (
      input.assignedTechnicianId !== undefined &&
      input.assignedTechnicianId !== previousTechnicianId
    ) {
      await assetHistoryRepository.append({
        assetId: id,
        event: HISTORY_EVENT.ASSIGNED,
        title: input.assignedTechnicianId ? 'Technician assigned' : 'Technician unassigned',
        actorId,
        metadata: { technicianId: input.assignedTechnicianId },
      });
    }

    return toPublicAsset(updated);
  }

  async assignTechnician(
    id: string,
    input: AssignTechnicianInput,
    actorId: string,
  ): Promise<PublicAsset> {
    const existing = await assetRepository.findById(id);
    if (!existing) throw new AppError('Asset not found', 404);

    if (input.technicianId) {
      await this.assertTechnician(input.technicianId);
    }

    const updated = await assetRepository.updateById(id, {
      assignedTechnicianId: input.technicianId,
      updatedById: actorId,
    });

    if (!updated) throw new AppError('Asset not found', 404);

    await assetHistoryRepository.append({
      assetId: id,
      event: HISTORY_EVENT.ASSIGNED,
      title: input.technicianId ? 'Technician assigned' : 'Technician unassigned',
      actorId,
      metadata: { technicianId: input.technicianId },
    });

    return toPublicAsset(updated);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const existing = await assetRepository.findById(id);
    if (!existing) throw new AppError('Asset not found', 404);

    await assetHistoryRepository.append({
      assetId: id,
      event: HISTORY_EVENT.RETIRED,
      title: 'Asset deleted',
      description: `${existing.assetCode} was removed from the registry`,
      actorId,
      metadata: { assetCode: existing.assetCode },
    });

    const deleted = await assetRepository.deleteById(id);
    if (!deleted) throw new AppError('Asset not found', 404);
  }

  async listHistory(assetId: string): Promise<AssetHistoryItem[]> {
    const asset = await assetRepository.findById(assetId);
    if (!asset) throw new AppError('Asset not found', 404);

    const rows = await assetHistoryRepository.listByAsset(assetId);
    return rows.map((row) => ({
      id: String(row._id),
      event: row.event,
      title: row.title,
      description: row.description,
      actor: asPopulatedUser(row.actorId),
      metadata: row.metadata,
      createdAt: row.createdAt,
    }));
  }

  private async assertTechnician(technicianId: string): Promise<void> {
    const user = await userRepository.findById(technicianId);
    if (!user || !user.isActive) {
      throw new AppError('Technician not found', 404);
    }
    if (user.role !== ROLES.TECHNICIAN && user.role !== ROLES.ADMINISTRATOR) {
      throw new AppError('Assigned user must be a technician', 400);
    }
  }
}

export const assetService = new AssetService();
