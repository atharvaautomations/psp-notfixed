import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { SchedulingService } from './scheduling.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post()
  @Roles(UserRole.RUBBER_TECHNOLOGIST, UserRole.SUPER_ADMIN)
  createSchedule(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: any
  ) {
    return this.schedulingService.createSchedule(dto, user.id);
  }

  @Get()
  @Roles(
    UserRole.STORES,
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.OPERATOR,
    UserRole.QUALITY_CONTROL,
    UserRole.SUPER_ADMIN
  )
  getSchedules(
    @Query() query: ScheduleQueryDto,
    @CurrentUser() user: any
  ) {
    return this.schedulingService.getSchedules(query, user.role, user.id);
  }

  @Get('my-schedules')
  @Roles(UserRole.OPERATOR)
  getMySchedules(
    @Query() query: ScheduleQueryDto,
    @CurrentUser() user: any
  ) {
    return this.schedulingService.getOperatorSchedules(user.id, query);
  }

  @Get('executions')
  @Roles(UserRole.RUBBER_TECHNOLOGIST, UserRole.SUPER_ADMIN)
  getAvailableExecutions() {
    return this.schedulingService.getAvailableExecutions();
  }

  @Get('operators')
  @Roles(UserRole.RUBBER_TECHNOLOGIST, UserRole.SUPER_ADMIN)
  getAvailableOperators() {
    return this.schedulingService.getAvailableOperators();
  }

  @Get(':id')
  @Roles(
    UserRole.STORES,
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.OPERATOR,
    UserRole.QUALITY_CONTROL,
    UserRole.SUPER_ADMIN
  )
  getScheduleById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    return this.schedulingService.getScheduleById(id, user.role, user.id);
  }

  @Post('refresh-statuses')
  @Roles(UserRole.RUBBER_TECHNOLOGIST, UserRole.SUPER_ADMIN)
  refreshStatuses() {
    return this.schedulingService.refreshScheduleStatuses();
  }
}