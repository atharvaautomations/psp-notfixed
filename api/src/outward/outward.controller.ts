import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { OutwardService } from './outward.service';
import { CreateOutwardDto } from './dto/create-outward.dto';

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

@Controller('outward')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
export class OutwardController {
  constructor(private readonly outwardService: OutwardService) {}

  @Post()
  create(@Body() data: CreateOutwardDto) {
    return this.outwardService.create(data);
  }

  @Post('from-requisition/:requisitionId')
  createFromRequisition(
    @Param('requisitionId', ParseIntPipe) requisitionId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.outwardService.createFromRequisition(requisitionId, {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  @Get()
  findAll() {
    return this.outwardService.findAll();
  }

  @Get('/analytics')
  async getAnalytics() {
    return this.outwardService.getAnalytics();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.outwardService.findOne(id);
  }

  @Post('scan-qr')
  async scanQr(@Body() body: { outwardId: number; qrId: string }) {
    return this.outwardService.scanQr(body.outwardId, body.qrId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.outwardService.remove(id);
  }
}
