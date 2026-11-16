import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ActivityLogData = {
  moduleType: string;
  activityType: string;
  referenceId?: string | null;
  bagNumber?: number | null;
  qrId?: string | null;
  grnNumber?: string | null;
  binNumber?: string | null;
  userId?: number | null;
  username?: string | null;
  status?: string;
  errorMessage?: string | null;
  metadata?: any;
};

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: ActivityLogData) {
    return this.prisma.activityLog.create({
      data: {
        moduleType: data.moduleType,
        activityType: data.activityType,
        referenceId: data.referenceId ?? null,
        bagNumber: data.bagNumber ?? null,
        qrId: data.qrId ?? null,
        grnNumber: data.grnNumber ?? null,
        binNumber: data.binNumber ?? null,
        userId: data.userId ?? null,
        username: data.username ?? null,
        status: data.status ?? 'Success',
        errorMessage: data.errorMessage ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async list(filters?: {
    moduleType?: string;
    activityType?: string;
    userId?: number;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    sort?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.moduleType) {
      where.moduleType = filters.moduleType;
    }

    if (filters?.activityType) {
      where.activityType = filters.activityType;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { referenceId: { contains: filters.search, mode: 'insensitive' } },
        { qrId: { contains: filters.search, mode: 'insensitive' } },
        { grnNumber: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { errorMessage: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: filters?.sort === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async export(filters?: {
    moduleType?: string;
    activityType?: string;
    userId?: number;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    sort?: 'asc' | 'desc';
  }) {
    const where: any = {};

    if (filters?.moduleType) {
      where.moduleType = filters.moduleType;
    }

    if (filters?.activityType) {
      where.activityType = filters.activityType;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { referenceId: { contains: filters.search, mode: 'insensitive' } },
        { qrId: { contains: filters.search, mode: 'insensitive' } },
        { grnNumber: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { errorMessage: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    return this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: filters?.sort === 'asc' ? 'asc' : 'desc' },
    });
  }
}
