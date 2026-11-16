import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AlertService } from './alert.service';
import { UpdateAlertStatusDto } from './dto/alert-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.STORES,
  UserRole.RUBBER_TECHNOLOGIST,
  UserRole.QUALITY_CONTROL,
  UserRole.SUPER_ADMIN
)
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  getAll() {
    return this.alertService.getAllAlerts();
  }

  @Post('generate')
  generate(@Query('unit') unit?: string) {
    return this.alertService.generateAlerts(unit);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAlertStatusDto
  ) {
    return this.alertService.updateAlertStatus(Number(id), dto.status);
  }
}
