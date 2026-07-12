import {
  MaintenanceRecordModel,
  type IMaintenanceMedia,
  type IMaintenancePart,
  type IMaintenanceRecordDocument,
  type MaintenanceStatus,
} from '../models/MaintenanceRecord.model.js';

export interface CreateMaintenanceRecord {
  recordNumber: string;
  issueId: string;
  assetId: string;
  technicianId: string;
  status?: MaintenanceStatus;
  inspectionNotes?: string;
  partsUsed?: IMaintenancePart[];
  cost?: number;
  timeTakenMinutes?: number;
  media?: IMaintenanceMedia[];
  aiSummary?: string;
  nextServiceDate?: Date | null;
}

export interface UpdateMaintenanceRecord {
  inspectionNotes?: string;
  partsUsed?: IMaintenancePart[];
  cost?: number;
  timeTakenMinutes?: number;
  media?: IMaintenanceMedia[];
  aiSummary?: string;
  nextServiceDate?: Date | null;
  status?: MaintenanceStatus;
  completionDate?: Date | null;
  technicianId?: string;
}

export interface MaintenanceListFilters {
  search?: string;
  status?: MaintenanceStatus;
  issueId?: string;
  assetId?: string;
  technicianId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export class MaintenanceRepository {
  async create(input: CreateMaintenanceRecord): Promise<IMaintenanceRecordDocument> {
    return MaintenanceRecordModel.create({
      ...input,
      partsUsed: input.partsUsed ?? [],
      media: input.media ?? [],
      inspectionNotes: input.inspectionNotes ?? '',
      cost: input.cost ?? 0,
      timeTakenMinutes: input.timeTakenMinutes ?? 0,
    });
  }

  async findById(id: string): Promise<IMaintenanceRecordDocument | null> {
    return MaintenanceRecordModel.findById(id)
      .populate('issueId', 'issueNumber title status priority category')
      .populate('assetId', 'assetCode name location category status condition')
      .populate('technicianId', 'name email role');
  }

  async findDraftByIssue(issueId: string): Promise<IMaintenanceRecordDocument | null> {
    return MaintenanceRecordModel.findOne({ issueId, status: 'draft' })
      .populate('issueId', 'issueNumber title status priority category')
      .populate('assetId', 'assetCode name location category status condition')
      .populate('technicianId', 'name email role');
  }

  async findLatestByIssue(issueId: string): Promise<IMaintenanceRecordDocument | null> {
    return MaintenanceRecordModel.findOne({ issueId })
      .sort({ createdAt: -1 })
      .populate('issueId', 'issueNumber title status priority category')
      .populate('assetId', 'assetCode name location category status condition')
      .populate('technicianId', 'name email role');
  }

  async updateById(
    id: string,
    input: UpdateMaintenanceRecord,
  ): Promise<IMaintenanceRecordDocument | null> {
    return MaintenanceRecordModel.findByIdAndUpdate(id, input, {
      new: true,
      runValidators: true,
    })
      .populate('issueId', 'issueNumber title status priority category')
      .populate('assetId', 'assetCode name location category status condition')
      .populate('technicianId', 'name email role');
  }

  async list(
    filters: MaintenanceListFilters,
  ): Promise<{ items: IMaintenanceRecordDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.status) query.status = filters.status;
    if (filters.issueId) query.issueId = filters.issueId;
    if (filters.assetId) query.assetId = filters.assetId;
    if (filters.technicianId) query.technicianId = filters.technicianId;

    if (filters.search) {
      query.$or = [
        { recordNumber: { $regex: filters.search, $options: 'i' } },
        { inspectionNotes: { $regex: filters.search, $options: 'i' } },
        { aiSummary: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [filters.sortBy]: filters.sortOrder === 'asc' ? 1 : -1,
    };
    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      MaintenanceRecordModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .populate('issueId', 'issueNumber title status priority')
        .populate('assetId', 'assetCode name location')
        .populate('technicianId', 'name email role'),
      MaintenanceRecordModel.countDocuments(query),
    ]);

    return { items, total };
  }

  async getNextSequence(): Promise<number> {
    const latest = await MaintenanceRecordModel.findOne()
      .sort({ recordNumber: -1 })
      .select('recordNumber')
      .lean();
    if (!latest?.recordNumber) return 1;
    const match = /^MNT-(\d{6})$/.exec(latest.recordNumber);
    return match ? Number(match[1]) + 1 : 1;
  }
}

export const maintenanceRepository = new MaintenanceRepository();
