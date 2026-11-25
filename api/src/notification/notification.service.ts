import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationData {
  title: string;
  message: string;
  type: NotificationType;
  userId?: number;
  module?: string;
  action?: string;
  severity?: string;
  referenceId?: string;
  activityLogId?: number;
  metadata?: Prisma.JsonValue;
  navigationRoute?: string;
}

interface FindAllOptions {
  userId?: number;
  isRead?: boolean;
  type?: NotificationType;
  module?: string;
  severity?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  sort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData) {
    try {
      return await this.prisma.notification.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          userId: data.userId ?? null,
          module: data.module ?? null,
          action: data.action ?? null,
          severity: data.severity ?? 'INFO',
          referenceId: data.referenceId ?? null,
          activityLogId: data.activityLogId ?? null,
          metadata: data.metadata ?? Prisma.JsonNull,
          navigationRoute: data.navigationRoute ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create notification', error);
    }
  }

  async createForUsers(
    data: Omit<CreateNotificationData, 'userId'>,
    userIds: number[]
  ): Promise<void> {
    if (userIds.length === 0) return;

    await Promise.all(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            title: data.title,
            message: data.message,
            type: data.type,
            userId,
            module: data.module ?? null,
            action: data.action ?? null,
            severity: data.severity ?? 'INFO',
            referenceId: data.referenceId ?? null,
            activityLogId: data.activityLogId ?? null,
            metadata: data.metadata ?? Prisma.JsonNull,
            navigationRoute: data.navigationRoute ?? null,
          },
        })
      )
    );
  }

  async findAll(options: FindAllOptions = {}) {
    const { userId, isRead, type, module, severity, search, fromDate, toDate, sort = 'desc', page = 1, limit = 50 } = options;

    const where: Prisma.NotificationWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    if (module) {
      where.module = module;
    }

    if (severity) {
      where.severity = severity;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: sort,
        },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findUnread(userId?: number) {
    const where: any = {
      isRead: false,
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.notification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findRecent(userId?: number, limit: number = 4) {
    const where: any = {
      isRead: false,
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.notification.findMany({
      where,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markAsRead(id: number, userId?: number) {
    const where: any = { id };

    if (userId) {
      where.userId = userId;
    }

    const notification = await this.prisma.notification.findUnique({ where });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return this.prisma.notification.update({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId?: number) {
    const where: any = {
      isRead: false,
    };

    if (userId) {
      where.userId = userId;
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async getUnreadCount(userId?: number): Promise<number> {
    const where: any = {
      isRead: false,
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.notification.count({ where });
  }
}