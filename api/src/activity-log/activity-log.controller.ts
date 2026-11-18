import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';

import { UserRole } from '@prisma/client';

import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('activity-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.STORES,
  UserRole.RUBBER_TECHNOLOGIST,
  UserRole.QUALITY_CONTROL,
  UserRole.SUPER_ADMIN
)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async list(
    @Query('moduleType') moduleType?: string,
    @Query('activityType') activityType?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.activityLogService.list({
      moduleType,
      activityType,
      userId: userId ? Number(userId) : undefined,
      status,
      search,
      fromDate,
      toDate,
      sort,
      page,
      limit,
    });
  }

  @Get('export')
  @HttpCode(200)
  async export(
    @Res({ passthrough: true }) res: Response,
    @Query('moduleType') moduleType?: string,
    @Query('activityType') activityType?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('format') format?: 'excel' | 'pdf',
  ) {
    const buffer = await this.activityLogService.export({
      moduleType,
      activityType,
      userId: userId ? Number(userId) : undefined,
      status,
      search,
      fromDate,
      toDate,
      sort,
      format: format ?? 'excel',
    });

    const filename = `history-export.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
