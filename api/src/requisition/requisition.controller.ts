import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { RequisitionService } from './requisition.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface AuthenticatedRequest {
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

@Controller('requisition')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  create(@Body() dto: CreateRequisitionDto, @Req() req: AuthenticatedRequest) {
    return this.requisitionService.create(dto, {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  @Get()
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST, UserRole.QUALITY_CONTROL, UserRole.SUPER_ADMIN)
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.requisitionService.findAll({ search, status, sort });
  }

  @Get(':id')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST, UserRole.QUALITY_CONTROL, UserRole.SUPER_ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requisitionService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequisitionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requisitionService.update(id, dto, {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  @Delete(':id')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requisitionService.remove(id, {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  @Patch(':id/approve')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST, UserRole.SUPER_ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requisitionService.approve(id, {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  @Patch(':id/reject')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST, UserRole.SUPER_ADMIN)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requisitionService.reject(id, {
      userId: req.user.id,
      username: req.user.username,
    }, body?.reason);
  }

  @Patch(':id/fulfill')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  fulfill(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requisitionService.fulfill(id, {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  @Patch(':id/link-outward/:outwardId')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  linkOutward(
    @Param('id', ParseIntPipe) id: number,
    @Param('outwardId', ParseIntPipe) outwardId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requisitionService.linkOutward(id, outwardId, {
      userId: req.user.id,
      username: req.user.username,
    });
  }
}
