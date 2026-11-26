import { Body, Controller, Post, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { ScanQrDto } from './dto/scan-qr.dto';
import { WeighingService } from './weighing.service';
import { CompleteWeighingDto } from './dto/complete-weighing.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('weighing')
export class WeighingController {
  constructor(private readonly weighingService: WeighingService) {}

  // PLC/service endpoint - don't add user JWT guard yet
  @Post('scan')
  scan(@Body() dto: ScanQrDto) {
    return this.weighingService.scan(dto);
  }

  // PLC/service endpoint - don't add user JWT guard yet
  @Post('complete')
  complete(@Body() dto: CompleteWeighingDto) {
    return this.weighingService.complete(dto);
  }

  @Get('executions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RUBBER_TECHNOLOGIST, UserRole.OPERATOR)
  findAllExecutions(@CurrentUser() user: any) {
    return this.weighingService.findAllExecutions(user);
  }

  @Get('executions/:id/final-batch-qrs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RUBBER_TECHNOLOGIST, UserRole.OPERATOR)
  getFinalBatchQrs(@Param('id', ParseIntPipe) id: number) {
    return this.weighingService.getFinalBatchQrs(id);
  }
}
