import { assetHistoryRepository } from '../../repositories/assetHistory.repository.js';
import { assetRepository } from '../../repositories/asset.repository.js';
import { ASSET_STATUS, HISTORY_EVENT, type AssetCondition, type AssetStatus } from '../../types/enums.js';
import { AppError } from '../../utils/AppError.js';

/** Public-safe asset payload — never includes internal IDs, emails, or secrets. */
export interface SafePublicAsset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  location: string;
  condition: AssetCondition;
  status: AssetStatus;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  hasAssignedTechnician: boolean;
  technicianDisplayName: string | null;
}

export interface SafePublicActivity {
  id: string;
  title: string;
  occurredAt: string;
}

const PUBLIC_SAFE_EVENTS = new Set<string>([
  HISTORY_EVENT.ASSET_CREATED,
  HISTORY_EVENT.INSPECTION_STARTED,
  HISTORY_EVENT.MAINTENANCE_STARTED,
  HISTORY_EVENT.PART_REPLACED,
  HISTORY_EVENT.RESOLVED,
  HISTORY_EVENT.REOPENED,
  HISTORY_EVENT.RETIRED,
]);

function toIso(value?: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function technicianDisplayName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { name?: string };
  if (!record.name) return null;
  // First name only — avoid exposing full staff identity + email publicly
  return record.name.split(/\s+/)[0] ?? null;
}

export class PublicAssetService {
  async getSafeAsset(assetId: string): Promise<SafePublicAsset> {
    const asset = await assetRepository.findById(assetId);
    if (!asset || asset.status === ASSET_STATUS.RETIRED) {
      throw new AppError('Asset not found', 404);
    }

    const techName = technicianDisplayName(asset.assignedTechnicianId);

    return {
      id: String(asset._id),
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      location: asset.location,
      condition: asset.condition,
      status: asset.status,
      lastServiceDate: toIso(asset.lastServiceDate),
      nextServiceDate: toIso(asset.nextServiceDate),
      hasAssignedTechnician: Boolean(techName),
      technicianDisplayName: techName,
    };
  }

  async getSafeActivity(assetId: string, limit = 8): Promise<SafePublicActivity[]> {
    // Ensures asset exists and is publicly visible
    await this.getSafeAsset(assetId);

    const rows = await assetHistoryRepository.listByAsset(assetId, limit * 2);
    return rows
      .filter((row) => PUBLIC_SAFE_EVENTS.has(row.event))
      .slice(0, limit)
      .map((row) => ({
        id: String(row._id),
        title: row.title,
        occurredAt: row.createdAt.toISOString(),
      }));
  }
}

export const publicAssetService = new PublicAssetService();
