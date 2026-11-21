import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

interface CreateNotificationData {
  title: string;
  message: string;
  type: NotificationType;
  userId?: number;
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
          },
        })
      )
    );
  }

  async findAll(userId?: number) {
    const where = userId ? { userId } : {};

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