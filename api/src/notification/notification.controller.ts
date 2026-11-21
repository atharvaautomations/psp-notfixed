import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.id;
    return this.notificationService.findAll(userId);
  }

  @Get('unread')
  async findUnread(@Req() req: any) {
    const userId = req.user?.id;
    return this.notificationService.findUnread(userId);
  }

  @Get('recent')
  async findRecent(@Req() req: any) {
    const userId = req.user?.id;
    return this.notificationService.findRecent(userId);
  }

  @Get('count')
  async getCount(@Req() req: any) {
    const userId = req.user?.id;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any
  ) {
    const userId = req.user?.id;
    return this.notificationService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id;
    return this.notificationService.markAllAsRead(userId);
  }
}