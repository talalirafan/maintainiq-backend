import type { IIssueDocument, IIssueEvidence } from '../../models/Issue.model.js';
import { assetHistoryRepository } from '../../repositories/assetHistory.repository.js';
import { assetRepository } from '../../repositories/asset.repository.js';
import { issueRepository } from '../../repositories/issue.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import type { PaginatedResult } from '../../types/api.js';
import {
  ASSET_STATUS,
  HISTORY_EVENT,
  ISSUE_STATUS,
  ROLES,
  type IssuePriority,
  type IssueStatus,
} from '../../types/enums.js';
import { AppError } from '../../utils/AppError.js';
import { formatIssueNumber } from '../../utils/issueNumber.js';
import { mailService } from '../email/mail.service.js';
import { aiService } from '../ai/ai.service.js';
import type { AiSuggestion } from '../../validators/ai.validator.js';
import type {
  AssignIssueInput,
  CreateIssueInput,
  ListIssuesQuery,
  PublicCreateIssueInput,
  ReopenIssueInput,
  ResolveIssueInput,
  TransitionIssueInput,
  UpdateIssueInput,
} from '../../validators/issue.validator.js';
import { env } from '../../config/env.js';

export interface IssueUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface IssueAssetSummary {
  id: string;
  assetCode: string;
  name: string;
  location?: string;
  category?: string;
  status?: string;
}

export interface PublicIssue {
  id: string;
  issueNumber: string;
  asset: IssueAssetSummary;
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  status: IssueStatus;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  assignedTechnician?: IssueUserSummary | null;
  evidence: IIssueEvidence[];
  resolutionNotes?: string;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  reopenedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ALLOWED_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [ISSUE_STATUS.REPORTED]: [ISSUE_STATUS.ASSIGNED, ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.ASSIGNED]: [
    ISSUE_STATUS.INSPECTION_STARTED,
    ISSUE_STATUS.MAINTENANCE,
    ISSUE_STATUS.WAITING_PARTS,
    ISSUE_STATUS.RESOLVED,
  ],
  [ISSUE_STATUS.INSPECTION_STARTED]: [
    ISSUE_STATUS.MAINTENANCE,
    ISSUE_STATUS.WAITING_PARTS,
    ISSUE_STATUS.RESOLVED,
  ],
  [ISSUE_STATUS.MAINTENANCE]: [ISSUE_STATUS.WAITING_PARTS, ISSUE_STATUS.RESOLVED],
  [ISSUE_STATUS.WAITING_PARTS]: [ISSUE_STATUS.MAINTENANCE, ISSUE_STATUS.RESOLVED],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.REOPENED],
  [ISSUE_STATUS.CLOSED]: [ISSUE_STATUS.REOPENED],
  [ISSUE_STATUS.REOPENED]: [
    ISSUE_STATUS.ASSIGNED,
    ISSUE_STATUS.INSPECTION_STARTED,
    ISSUE_STATUS.MAINTENANCE,
  ],
};

function asUser(value: unknown): IssueUserSummary | null {
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

function asAsset(value: unknown, fallbackId?: string): IssueAssetSummary {
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

function toPublicIssue(issue: IIssueDocument): PublicIssue {
  return {
    id: String(issue._id),
    issueNumber: issue.issueNumber,
    asset: asAsset(issue.assetId),
    title: issue.title,
    description: issue.description,
    category: issue.category,
    priority: issue.priority,
    status: issue.status,
    reporterName: issue.reporterName,
    reporterEmail: issue.reporterEmail,
    reporterPhone: issue.reporterPhone,
    assignedTechnician: asUser(issue.assignedTechnicianId),
    evidence: issue.evidence ?? [],
    resolutionNotes: issue.resolutionNotes,
    resolvedAt: issue.resolvedAt,
    closedAt: issue.closedAt,
    reopenedAt: issue.reopenedAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

export class IssueService {
  async createAuthenticated(
    input: CreateIssueInput,
    actor: { id: string; name: string; email: string },
  ): Promise<PublicIssue> {
    return this.createInternal({
      assetId: input.assetId,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      reporterName: input.reporterName ?? actor.name,
      reporterEmail: input.reporterEmail ?? actor.email,
      reporterPhone: input.reporterPhone,
      reportedById: actor.id,
      assignedTechnicianId: input.assignedTechnicianId ?? null,
      evidence: input.evidence,
      actorId: actor.id,
      aiLogId: input.aiLogId,
      editedAiSuggestion: input.editedAiSuggestion,
    });
  }

  async createPublic(assetId: string, input: PublicCreateIssueInput): Promise<PublicIssue> {
    return this.createInternal({
      assetId,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      reporterName: input.reporterName,
      reporterEmail: input.reporterEmail,
      reporterPhone: input.reporterPhone,
      reportedById: null,
      assignedTechnicianId: null,
      evidence: input.evidence,
      actorId: null,
      aiLogId: input.aiLogId,
      editedAiSuggestion: input.editedAiSuggestion,
    });
  }

  async list(query: ListIssuesQuery): Promise<PaginatedResult<PublicIssue>> {
    const openStatuses: IssueStatus[] = [
      ISSUE_STATUS.REPORTED,
      ISSUE_STATUS.ASSIGNED,
      ISSUE_STATUS.INSPECTION_STARTED,
      ISSUE_STATUS.MAINTENANCE,
      ISSUE_STATUS.WAITING_PARTS,
      ISSUE_STATUS.REOPENED,
    ];

    const { items, total } = await issueRepository.list({
      search: query.search,
      status: query.status,
      statuses: !query.status && query.openOnly ? openStatuses : undefined,
      priority: query.priority,
      category: query.category,
      assetId: query.assetId,
      technicianId: query.technicianId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: items.map(toPublicIssue),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getById(id: string): Promise<PublicIssue> {
    const issue = await issueRepository.findById(id);
    if (!issue) throw new AppError('Issue not found', 404);
    return toPublicIssue(issue);
  }

  async update(id: string, input: UpdateIssueInput): Promise<PublicIssue> {
    const existing = await issueRepository.findById(id);
    if (!existing) throw new AppError('Issue not found', 404);

    const updated = await issueRepository.updateById(id, input);
    if (!updated) throw new AppError('Issue not found', 404);
    return toPublicIssue(updated);
  }

  async assign(id: string, input: AssignIssueInput, actorId: string): Promise<PublicIssue> {
    const existing = await issueRepository.findById(id);
    if (!existing) throw new AppError('Issue not found', 404);

    const technician = await this.assertTechnician(input.technicianId);
    const nextStatus =
      existing.status === ISSUE_STATUS.REPORTED || existing.status === ISSUE_STATUS.REOPENED
        ? ISSUE_STATUS.ASSIGNED
        : existing.status;

    const updated = await issueRepository.updateById(id, {
      assignedTechnicianId: input.technicianId,
      status: nextStatus,
    });
    if (!updated) throw new AppError('Issue not found', 404);

    await assetHistoryRepository.append({
      assetId: String(
        typeof existing.assetId === 'object' && existing.assetId !== null && '_id' in existing.assetId
          ? (existing.assetId as { _id: { toString(): string } })._id
          : existing.assetId,
      ),
      event: HISTORY_EVENT.ASSIGNED,
      title: `Issue ${existing.issueNumber} assigned`,
      description: `Assigned to ${technician.name}`,
      actorId,
      metadata: { issueId: id, technicianId: input.technicianId },
    });

    await mailService.send({
      to: technician.email,
      subject: `Issue assigned · ${existing.issueNumber}`,
      text: `You have been assigned ${existing.issueNumber}: ${existing.title}\n\nOpen: ${env.clientUrl}/issues/${id}`,
      html: `<p>You have been assigned <strong>${existing.issueNumber}</strong>: ${existing.title}</p><p><a href="${env.clientUrl}/issues/${id}">Open issue</a></p>`,
    });

    return toPublicIssue(updated);
  }

  async transition(
    id: string,
    input: TransitionIssueInput,
    actorId: string,
  ): Promise<PublicIssue> {
    const existing = await issueRepository.findById(id);
    if (!existing) throw new AppError('Issue not found', 404);

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        `Cannot move issue from ${existing.status} to ${input.status}`,
        400,
      );
    }

    if (input.status === ISSUE_STATUS.RESOLVED) {
      return this.resolve(id, { resolutionNotes: input.notes ?? 'Resolved' }, actorId);
    }

    if (input.status === ISSUE_STATUS.REOPENED) {
      return this.reopen(id, { notes: input.notes }, actorId);
    }

    const updated = await issueRepository.updateById(id, {
      status: input.status,
      closedAt: input.status === ISSUE_STATUS.CLOSED ? new Date() : existing.closedAt,
    });
    if (!updated) throw new AppError('Issue not found', 404);

    const historyEvent =
      input.status === ISSUE_STATUS.INSPECTION_STARTED
        ? HISTORY_EVENT.INSPECTION_STARTED
        : input.status === ISSUE_STATUS.MAINTENANCE
          ? HISTORY_EVENT.MAINTENANCE_STARTED
          : HISTORY_EVENT.ASSIGNED;

    await assetHistoryRepository.append({
      assetId: asAsset(existing.assetId).id,
      event: historyEvent,
      title: `Issue ${existing.issueNumber} → ${input.status.replaceAll('_', ' ')}`,
      description: input.notes,
      actorId,
      metadata: { issueId: id, status: input.status },
    });

    await this.syncAssetStatus(asAsset(existing.assetId).id, input.status, actorId);

    return toPublicIssue(updated);
  }

  async resolve(id: string, input: ResolveIssueInput, actorId: string): Promise<PublicIssue> {
    const existing = await issueRepository.findById(id);
    if (!existing) throw new AppError('Issue not found', 404);

    if (
      !(
        [
          ISSUE_STATUS.ASSIGNED,
          ISSUE_STATUS.INSPECTION_STARTED,
          ISSUE_STATUS.MAINTENANCE,
          ISSUE_STATUS.WAITING_PARTS,
          ISSUE_STATUS.REOPENED,
        ] as IssueStatus[]
      ).includes(existing.status)
    ) {
      throw new AppError(`Cannot resolve issue in status ${existing.status}`, 400);
    }

    const updated = await issueRepository.updateById(id, {
      status: ISSUE_STATUS.RESOLVED,
      resolutionNotes: input.resolutionNotes,
      resolvedAt: new Date(),
    });
    if (!updated) throw new AppError('Issue not found', 404);

    const assetId = asAsset(existing.assetId).id;
    await assetHistoryRepository.append({
      assetId,
      event: HISTORY_EVENT.RESOLVED,
      title: `Issue ${existing.issueNumber} resolved`,
      description: input.resolutionNotes,
      actorId,
      metadata: { issueId: id },
    });

    await this.syncAssetStatus(assetId, ISSUE_STATUS.RESOLVED, actorId);

    await mailService.send({
      to: existing.reporterEmail,
      subject: `Issue resolved · ${existing.issueNumber}`,
      text: `Your issue ${existing.issueNumber} has been resolved.\n\n${input.resolutionNotes}`,
      html: `<p>Your issue <strong>${existing.issueNumber}</strong> has been resolved.</p><p>${input.resolutionNotes}</p>`,
    });

    return toPublicIssue(updated);
  }

  async reopen(id: string, input: ReopenIssueInput, actorId: string): Promise<PublicIssue> {
    const existing = await issueRepository.findById(id);
    if (!existing) throw new AppError('Issue not found', 404);

    if (
      existing.status !== ISSUE_STATUS.RESOLVED &&
      existing.status !== ISSUE_STATUS.CLOSED
    ) {
      throw new AppError('Only resolved or closed issues can be reopened', 400);
    }

    const updated = await issueRepository.updateById(id, {
      status: ISSUE_STATUS.REOPENED,
      reopenedAt: new Date(),
      closedAt: null,
      resolvedAt: null,
    });
    if (!updated) throw new AppError('Issue not found', 404);

    const assetId = asAsset(existing.assetId).id;
    await assetHistoryRepository.append({
      assetId,
      event: HISTORY_EVENT.REOPENED,
      title: `Issue ${existing.issueNumber} reopened`,
      description: input.notes,
      actorId,
      metadata: { issueId: id },
    });

    await this.syncAssetStatus(assetId, ISSUE_STATUS.REOPENED, actorId);
    return toPublicIssue(updated);
  }

  private async createInternal(input: {
    assetId: string;
    title: string;
    description: string;
    category: string;
    priority: IssuePriority;
    reporterName: string;
    reporterEmail: string;
    reporterPhone?: string;
    reportedById: string | null;
    assignedTechnicianId: string | null;
    evidence?: IIssueEvidence[];
    actorId: string | null;
    aiLogId?: string;
    editedAiSuggestion?: AiSuggestion;
  }): Promise<PublicIssue> {
    const asset = await assetRepository.findById(input.assetId);
    if (!asset || asset.status === ASSET_STATUS.RETIRED) {
      throw new AppError('Asset not found', 404);
    }

    if (input.aiLogId) {
      if (!input.editedAiSuggestion) {
        throw new AppError('Edited AI suggestion is required when using AI triage', 400);
      }
    }

    if (input.assignedTechnicianId) {
      await this.assertTechnician(input.assignedTechnicianId);
    }

    const sequence = await issueRepository.getNextIssueSequence();
    const issue = await issueRepository.create({
      issueNumber: formatIssueNumber(sequence),
      assetId: input.assetId,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: input.assignedTechnicianId ? ISSUE_STATUS.ASSIGNED : ISSUE_STATUS.REPORTED,
      reporterName: input.reporterName,
      reporterEmail: input.reporterEmail,
      reporterPhone: input.reporterPhone,
      reportedById: input.reportedById,
      assignedTechnicianId: input.assignedTechnicianId,
      evidence: input.evidence,
    });

    if (input.aiLogId && input.editedAiSuggestion) {
      await aiService.markApplied(input.aiLogId, String(issue._id), input.editedAiSuggestion);
    }

    await assetHistoryRepository.append({
      assetId: input.assetId,
      event: HISTORY_EVENT.ISSUE_REPORTED,
      title: `Issue ${issue.issueNumber} reported`,
      description: input.title,
      actorId: input.actorId,
      metadata: {
        issueId: String(issue._id),
        priority: input.priority,
        aiAssisted: Boolean(input.aiLogId),
      },
    });

    await assetRepository.updateById(input.assetId, {
      status: ASSET_STATUS.ISSUE_REPORTED,
      updatedById: input.actorId ?? undefined,
    });

    if (input.assignedTechnicianId) {
      const technician = await userRepository.findById(input.assignedTechnicianId);
      if (technician) {
        await mailService.send({
          to: technician.email,
          subject: `Issue assigned · ${issue.issueNumber}`,
          text: `You have been assigned ${issue.issueNumber}: ${issue.title}`,
        });
      }
    }

    const hydrated = await issueRepository.findById(String(issue._id));
    return toPublicIssue(hydrated ?? issue);
  }

  private async assertTechnician(technicianId: string) {
    const user = await userRepository.findById(technicianId);
    if (!user || !user.isActive) {
      throw new AppError('Technician not found', 404);
    }
    if (user.role !== ROLES.TECHNICIAN && user.role !== ROLES.ADMINISTRATOR) {
      throw new AppError('Assigned user must be a technician', 400);
    }
    return user;
  }

  private async syncAssetStatus(
    assetId: string,
    issueStatus: IssueStatus,
    actorId: string,
  ): Promise<void> {
    const map: Partial<Record<IssueStatus, (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS]>> = {
      [ISSUE_STATUS.REPORTED]: ASSET_STATUS.ISSUE_REPORTED,
      [ISSUE_STATUS.ASSIGNED]: ASSET_STATUS.ISSUE_REPORTED,
      [ISSUE_STATUS.REOPENED]: ASSET_STATUS.ISSUE_REPORTED,
      [ISSUE_STATUS.INSPECTION_STARTED]: ASSET_STATUS.INSPECTION,
      [ISSUE_STATUS.MAINTENANCE]: ASSET_STATUS.MAINTENANCE,
      [ISSUE_STATUS.WAITING_PARTS]: ASSET_STATUS.MAINTENANCE,
      [ISSUE_STATUS.RESOLVED]: ASSET_STATUS.OPERATIONAL,
      [ISSUE_STATUS.CLOSED]: ASSET_STATUS.OPERATIONAL,
    };

    const next = map[issueStatus];
    if (!next) return;

    await assetRepository.updateById(assetId, {
      status: next,
      updatedById: actorId,
    });
  }
}

export const issueService = new IssueService();
