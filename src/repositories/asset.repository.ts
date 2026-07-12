import { AssetModel, type IAssetDocument } from '../models/Asset.model.js';
import type { AssetCondition, AssetStatus } from '../types/enums.js';

export interface CreateAssetRecord {
  assetCode: string;
  name: string;
  category: string;
  location: string;
  condition: AssetCondition;
  status: AssetStatus;
  description?: string;
  assignedTechnicianId?: string | null;
  lastServiceDate?: Date | null;
  nextServiceDate?: Date | null;
  createdById: string;
}

export interface UpdateAssetRecord {
  name?: string;
  category?: string;
  location?: string;
  condition?: AssetCondition;
  status?: AssetStatus;
  description?: string;
  assignedTechnicianId?: string | null;
  lastServiceDate?: Date | null;
  nextServiceDate?: Date | null;
  updatedById?: string;
}

export interface AssetListFilters {
  search?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  category?: string;
  location?: string;
  technicianId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export class AssetRepository {
  async create(input: CreateAssetRecord): Promise<IAssetDocument> {
    return AssetModel.create({
      ...input,
      assignedTechnicianId: input.assignedTechnicianId ?? null,
    });
  }

  async findById(id: string): Promise<IAssetDocument | null> {
    return AssetModel.findById(id)
      .populate('assignedTechnicianId', 'name email role')
      .populate('createdById', 'name email');
  }

  async findByCode(assetCode: string): Promise<IAssetDocument | null> {
    return AssetModel.findOne({ assetCode: assetCode.toUpperCase() });
  }

  async updateById(id: string, input: UpdateAssetRecord): Promise<IAssetDocument | null> {
    return AssetModel.findByIdAndUpdate(id, input, { new: true, runValidators: true })
      .populate('assignedTechnicianId', 'name email role')
      .populate('createdById', 'name email');
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await AssetModel.findByIdAndDelete(id);
    return Boolean(result);
  }

  async list(filters: AssetListFilters): Promise<{ items: IAssetDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.status) query.status = filters.status;
    if (filters.condition) query.condition = filters.condition;
    if (filters.category) query.category = { $regex: filters.category, $options: 'i' };
    if (filters.location) query.location = { $regex: filters.location, $options: 'i' };
    if (filters.technicianId) query.assignedTechnicianId = filters.technicianId;

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { assetCode: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } },
        { location: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [filters.sortBy]: filters.sortOrder === 'asc' ? 1 : -1,
    };
    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      AssetModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(filters.limit)
        .populate('assignedTechnicianId', 'name email role'),
      AssetModel.countDocuments(query),
    ]);

    return { items, total };
  }

  async getNextAssetSequence(): Promise<number> {
    const latest = await AssetModel.findOne()
      .sort({ assetCode: -1 })
      .select('assetCode')
      .lean();

    if (!latest?.assetCode) return 1;

    const match = /^AST-(\d{6})$/.exec(latest.assetCode);
    return match ? Number(match[1]) + 1 : 1;
  }

  async findDueForService(withinDays: number): Promise<IAssetDocument[]> {
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + withinDays);

    return AssetModel.find({
      status: { $ne: 'retired' },
      nextServiceDate: { $ne: null, $lte: until },
    })
      .populate('assignedTechnicianId', 'name email role')
      .limit(200);
  }
}

export const assetRepository = new AssetRepository();
