import type {
  IMaintenanceMedia,
  IMaintenancePart,
  IMaintenanceRecordDocument,
  MaintenanceStatus,
} from '../../models/MaintenanceRecord.model.js';
import { MAINTENANCE_STATUS } from '../../models/MaintenanceRecord.model.js';
import { assetHistoryRepository } from '../../repositories/assetHistory.repository.js';
import { assetRepository } from '../../repositories/asset.repository.js';
import { issueRepository } from '../../repositories/issue.repository.js';
import { maintenanceRepository } from '../../repositories/maintenance.repository.js';
import type { PaginatedResult } from '../../types/api.js';
import {
  ASSET_STATUS,
  HISTORY_EVENT,
  ISSUE_STATUS,
  ROLES,
  type IssueStatus,
} from '../../types/enums.js';
import { AppError } from '../../utils/AppError.js';
import { formatMaintenanceNumber } from '../../utils/maintenanceNumber.js';
import { issueService } from '../issues/issue.service.js';
import type {
  CompleteMaintenanceInput,
  ListMaintenanceQuery,
  StartMaintenanceInput,
  UpdateMaintenanceInput,
} from '../../validators/maintenance.validator.js';

export interface PublicUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PublicIssueSummary {
  id: string;
  issueNumber: string;
  title: string;
  status: string;
  priority?: string;
  category?: string;
}

export interface PublicAssetSummary {
  id: string;
  assetCode: string;
  name: string;
  location?: string;
  category?: string;
  status?: string;
  condition?: string;
}

export interface PublicMaintenanceRecord {
  id: string;
  recordNumber: string;
  issue: PublicIssueSummary;
  asset: PublicAssetSummary;
  technician: PublicUserSummary;
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

function asUser(value: unknown): PublicUserSummary {
  if (!value || typeof value !== 'object') {
    return { id: String(value), name: 'Unknown', email: '', role: '' };
  }
  const record = value as {
    _id?: { toString(): string };
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  return {
    id: record.id ?? record._id?.toString() ?? '',
    name: record.name ?? 'Unknown',
    email: record.email ?? '',
    role: record.role ?? '',
  };
}

function asIssue(value: unknown, fallbackId?: string): PublicIssueSummary {
  if (value && typeof value === 'object' && 'issueNumber' in value) {
    const record = value as {
      _id?: { toString(): string };
      id?: string;
      issueNumber: string;
      title: string;
      status: string;
      priority?: string;
      category?: string;
    };
    return {
      id: record.id ?? record._id?.toString() ?? fallbackId ?? '',
      issueNumber: record.issueNumber,
      title: record.title,
      status: record.status,
      priority: record.priority,
      category: record.category,
    };
  }
  return {
    id: fallbackId ?? String(value),
    issueNumber: 'UNKNOWN',
    title: 'Unknown issue',
    status: 'reported',
  };
}

function asAsset(value: unknown, fallbackId?: string): PublicAssetSummary {
  if (value && typeof value === 'object' && 'assetCode' in value) {
    const record = value as {
      _id?: { toString(): string };
      id?: string;
      assetCode: string;
      name: string;
      location?: string;
      category?: string;
      status?: string;
      condition?: string;
    };
    return {
      id: record.id ?? record._id?.toString() ?? fallbackId ?? '',
      assetCode: record.assetCode,
      name: record.name,
      location: record.location,
      category: record.category,
      status: record.status,
      condition: record.condition,
    };
  }
  return {
    id: fallbackId ?? String(value),
    assetCode: 'UNKNOWN',
    name: 'Unknown asset',
  };
}

function toPublic(record: IMaintenanceRecordDocument): PublicMaintenanceRecord {
  return {
    id: String(record._id),
    recordNumber: record.recordNumber,
    issue: asIssue(record.issueId),
    asset: asAsset(record.assetId),
    technician: asUser(record.technicianId),
    status: record.status,
    inspectionNotes: record.inspectionNotes ?? '',
    partsUsed: record.partsUsed ?? [],
    cost: record.cost ?? 0,
    timeTakenMinutes: record.timeTakenMinutes ?? 0,
    media: record.media ?? [],
    aiSummary: record.aiSummary,
    completionDate: record.completionDate,
    nextServiceDate: record.nextServiceDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function resolveAssetId(issueAssetId: unknown): string {
  if (issueAssetId && typeof issueAssetId === 'object' && '_id' in issueAssetId) {
    return String((issueAssetId as { _id: { toString(): string } })._id);
  }
  return String(issueAssetId);
}

const OPEN_ISSUE_STATUSES: IssueStatus[] = [
  ISSUE_STATUS.ASSIGNED,
  ISSUE_STATUS.INSPECTION_STARTED,
  ISSUE_STATUS.MAINTENANCE,
  ISSUE_STATUS.WAITING_PARTS,
  ISSUE_STATUS.REOPENED,
];

export class MaintenanceService {
  async list(query: ListMaintenanceQuery): Promise<PaginatedResult<PublicMaintenanceRecord>> {
    const { items, total } = await maintenanceRepository.list({
      search: query.search,
      status: query.status,
      issueId: query.issueId,
      assetId: query.assetId,
      technicianId: query.technicianId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
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

  async getById(id: string): Promise<PublicMaintenanceRecord> {
    const record = await maintenanceRepository.findById(id);
    if (!record) throw new AppError('Maintenance record not found', 404);
    return toPublic(record);
  }

  async getByIssue(issueId: string): Promise<PublicMaintenanceRecord | null> {
    const draft = await maintenanceRepository.findDraftByIssue(issueId);
    if (draft) return toPublic(draft);
    const latest = await maintenanceRepository.findLatestByIssue(issueId);
    return latest ? toPublic(latest) : null;
  }

  async start(
    input: StartMaintenanceInput,
    actor: { id: string; role: string },
  ): Promise<PublicMaintenanceRecord> {
    const issue = await issueRepository.findById(input.issueId);
    if (!issue) throw new AppError('Issue not found', 404);

    if (!(OPEN_ISSUE_STATUSES as IssueStatus[]).includes(issue.status)) {
      throw new AppError(`Cannot start maintenance for issue in status ${issue.status}`, 400);
    }

    const existingDraft = await maintenanceRepository.findDraftByIssue(input.issueId);
    if (existingDraft) return toPublic(existingDraft);

    const assignedRaw = issue.assignedTechnicianId as unknown;
    let assignedId: string | null = null;
    if (assignedRaw && typeof assignedRaw === 'object') {
      const populated = assignedRaw as { _id?: { toString(): string }; id?: string };
      assignedId = populated.id ?? populated._id?.toString() ?? null;
    } else if (assignedRaw) {
      assignedId = String(assignedRaw);
    }

    if (actor.role === ROLES.TECHNICIAN) {
      if (!assignedId || assignedId !== actor.id) {
        throw new AppError('You can only maintain issues assigned to you', 403);
      }
    }

    const technicianId = assignedId ?? actor.id;
    if (!assignedId) {
      await issueRepository.updateById(input.issueId, {
        assignedTechnicianId: actor.id,
        status:
          issue.status === ISSUE_STATUS.REPORTED || issue.status === ISSUE_STATUS.REOPENED
            ? ISSUE_STATUS.ASSIGNED
            : issue.status,
      });
    }

    const assetId = resolveAssetId(issue.assetId);
    const sequence = await maintenanceRepository.getNextSequence();
    const record = await maintenanceRepository.create({
      recordNumber: formatMaintenanceNumber(sequence),
      issueId: input.issueId,
      assetId,
      technicianId,
      status: MAINTENANCE_STATUS.DRAFT,
    });

    if (
      issue.status !== ISSUE_STATUS.MAINTENANCE &&
      issue.status !== ISSUE_STATUS.WAITING_PARTS
    ) {
      await issueService.transition(
        input.issueId,
        { status: ISSUE_STATUS.MAINTENANCE },
        actor.id,
      );
    } else {
      await assetHistoryRepository.append({
        assetId,
        event: HISTORY_EVENT.MAINTENANCE_STARTED,
        title: `Maintenance ${formatMaintenanceNumber(sequence)} started`,
        description: `Work started on ${issue.issueNumber}`,
        actorId: actor.id,
        metadata: { issueId: input.issueId, maintenanceId: String(record._id) },
      });
    }

    const hydrated = await maintenanceRepository.findById(String(record._id));
    return toPublic(hydrated ?? record);
  }

  async update(
    id: string,
    input: UpdateMaintenanceInput,
    actor: { id: string; role: string },
  ): Promise<PublicMaintenanceRecord> {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) throw new AppError('Maintenance record not found', 404);
    if (existing.status === MAINTENANCE_STATUS.COMPLETED) {
      throw new AppError('Completed maintenance records cannot be edited', 400);
    }

    this.assertCanEdit(existing, actor);

    const updated = await maintenanceRepository.updateById(id, input);
    if (!updated) throw new AppError('Maintenance record not found', 404);
    return toPublic(updated);
  }

  async complete(
    id: string,
    input: CompleteMaintenanceInput,
    actor: { id: string; role: string },
  ): Promise<PublicMaintenanceRecord> {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) throw new AppError('Maintenance record not found', 404);
    if (existing.status === MAINTENANCE_STATUS.COMPLETED) {
      throw new AppError('Maintenance record is already completed', 400);
    }

    this.assertCanEdit(existing, actor);

    const completionDate = input.completionDate ?? new Date();
    const updated = await maintenanceRepository.updateById(id, {
      inspectionNotes: input.inspectionNotes,
      partsUsed: input.partsUsed,
      cost: input.cost,
      timeTakenMinutes: input.timeTakenMinutes,
      media: input.media,
      aiSummary: input.aiSummary,
      nextServiceDate: input.nextServiceDate,
      completionDate,
      status: MAINTENANCE_STATUS.COMPLETED,
    });
    if (!updated) throw new AppError('Maintenance record not found', 404);

    const assetId = asAsset(existing.assetId).id;
    const issue = asIssue(existing.issueId);

    for (const part of input.partsUsed) {
      await assetHistoryRepository.append({
        assetId,
        event: HISTORY_EVENT.PART_REPLACED,
        title: `Part used: ${part.name}`,
        description: `Qty ${part.quantity}${part.unitCost != null ? ` · unit cost ${part.unitCost}` : ''}`,
        actorId: actor.id,
        metadata: {
          issueId: issue.id,
          maintenanceId: id,
          part,
        },
      });
    }

    await assetHistoryRepository.append({
      assetId,
      event: HISTORY_EVENT.MAINTENANCE_STARTED,
      title: `Maintenance ${existing.recordNumber} completed`,
      description: input.aiSummary?.slice(0, 500) || input.inspectionNotes.slice(0, 500),
      actorId: actor.id,
      metadata: {
        issueId: issue.id,
        maintenanceId: id,
        cost: input.cost,
        timeTakenMinutes: input.timeTakenMinutes,
        nextServiceDate: input.nextServiceDate,
      },
    });

    await assetRepository.updateById(assetId, {
      lastServiceDate: completionDate,
      nextServiceDate: input.nextServiceDate,
      status: input.resolveIssue ? ASSET_STATUS.OPERATIONAL : ASSET_STATUS.MAINTENANCE,
      updatedById: actor.id,
    });

    if (input.resolveIssue) {
      const notes =
        input.resolutionNotes ??
        input.aiSummary ??
        input.inspectionNotes.slice(0, 2000);
      await issueService.resolve(issue.id, { resolutionNotes: notes }, actor.id);
    }

    return toPublic(updated);
  }

  private assertCanEdit(
    record: IMaintenanceRecordDocument,
    actor: { id: string; role: string },
  ): void {
    if (actor.role === ROLES.ADMINISTRATOR || actor.role === ROLES.SUPERVISOR) return;
    const tech = asUser(record.technicianId);
    if (tech.id !== actor.id) {
      throw new AppError('You can only edit your own maintenance records', 403);
    }
  }
}

export const maintenanceService = new MaintenanceService();
