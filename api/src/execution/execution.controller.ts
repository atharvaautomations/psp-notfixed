import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { ExecutionService } from './execution.service';
import { CreateExecutionDto } from './dto/create-execution.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('executions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Post()
  @Roles(UserRole.RUBBER_TECHNOLOGIST)
  create(@Body() dto: CreateExecutionDto) {
    return this.executionService.create(dto);
  }

  @Get(':id/qrs')
  @Roles(
    UserRole.STORES,
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.OPERATOR,
    UserRole.QUALITY_CONTROL
  )
  findExecutionQrs(@Param('id', ParseIntPipe) id: number) {
    return this.executionService.findExecutionQrs(id);
  }

  @Get('tracking')
  @Roles(
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.OPERATOR,
    UserRole.QUALITY_CONTROL
  )
  getTrackingList() {
    return this.executionService.getTrackingList();
  }

  @Get(':id/tracking')
  @Roles(
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.OPERATOR,
    UserRole.QUALITY_CONTROL
  )
  getTracking(@Param('id', ParseIntPipe) id: number) {
    return this.executionService.getTracking(id);
  }
}
