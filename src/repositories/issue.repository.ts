import { IssueModel, type IIssueDocument, type IIssueEvidence } from '../models/Issue.model.js';
import type { IssuePriority, IssueStatus } from '../types/enums.js';

export interface CreateIssueRecord {
  issueNumber: string;
  assetId: string;
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  status: IssueStatus;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  reportedById?: string | null;
  assignedTechnicianId?: string | null;
  evidence?: IIssueEvidence[];
}

export interface UpdateIssueRecord {
  title?: string;
  description?: string;
  category?: string;
  priority?: IssuePriority;
  status?: IssueStatus;
  assignedTechnicianId?: string | null;
  evidence?: IIssueEvidence[];
  resolutionNotes?: string;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  reopenedAt?: Date | null;
}

export interface IssueListFilters {
  search?: string;
  status?: IssueStatus;
  statuses?: IssueStatus[];
  priority?: IssuePriority;
  category?: string;
  assetId?: string;
  technicianId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export class IssueRepository {
  async create(input: CreateIssueRecord): Promise<IIssueDocument> {
    return IssueModel.create({
      ...input,
      evidence: input.evidence ?? [],
      assignedTechnicianId: input.assignedTechnicianId ?? null,
      reportedById: input.reportedById ?? null,
    });
  }

  async findById(id: string): Promise<IIssueDocument | null> {
    return IssueModel.findById(id)
      .populate('assetId', 'assetCode name location category status')
      .populate('assignedTechnicianId', 'name email role')
      .populate('reportedById', 'name email role');
  }

  async updateById(id: string, input: UpdateIssueRecord): Promise<IIssueDocument | null> {
    return IssueModel.findByIdAndUpdate(id, input, { new: true, runValidators: true })
      .populate('assetId', 'assetCode name location category status')
      .populate('assignedTechnicianId', 'name email role')
      .populate('reportedById', 'name email role');
  }

  async list(filters: IssueListFilters): Promise<{ items: IIssueDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.status) query.status = filters.status;
    else if (filters.statuses?.length) query.status = { $in: filters.statuses };
    if (filters.priority) query.priority = filters.priority;
    if (filters.category) query.category = { $regex: filters.category, $options: 'i' };
    if (filters.assetId) query.assetId = filters.assetId;
    if (filters.technicianId) query.assignedTechnicianId = filters.technicianId;

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { issueNumber: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } },
        { reporterName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [filters.sortBy]: filters.sortOrder === 'asc' ? 1 : -1,
    };
    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      IssueModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .populate('assetId', 'assetCode name location')
        .populate('assignedTechnicianId', 'name email role'),
      IssueModel.countDocuments(query),
    ]);

    return { items, total };
  }

  async getNextIssueSequence(): Promise<number> {
    const latest = await IssueModel.findOne().sort({ issueNumber: -1 }).select('issueNumber').lean();
    if (!latest?.issueNumber) return 1;
    const match = /^ISS-(\d{6})$/.exec(latest.issueNumber);
    return match ? Number(match[1]) + 1 : 1;
  }
}

export const issueRepository = new IssueRepository();
