import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { SystemConfigService } from './system-config.service';

import { UpdateDeviceDto } from './dto/update-device.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get('devices')
  getDevices() {
    return this.systemConfigService.getDevices();
  }

  @Get('devices/:key')
  getDevice(@Param('key') key: string) {
    return this.systemConfigService.getDevice(key);
  }

  @Patch('devices/:key')
  updateDevice(@Param('key') key: string, @Body() dto: UpdateDeviceDto) {
    return this.systemConfigService.updateDevice(key, dto);
  }

  @Get('services')
  getServices() {
    return this.systemConfigService.getServices();
  }

  @Get('services/:key')
  getService(@Param('key') key: string) {
    return this.systemConfigService.getService(key);
  }

  @Patch('services/:key')
  updateService(@Param('key') key: string, @Body() dto: UpdateServiceDto) {
    return this.systemConfigService.updateService(key, dto);
  }

  @Get('settings')
  getSettings() {
    return this.systemConfigService.getSettings();
  }

  @Patch('settings/:key')
  updateSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.systemConfigService.updateSetting(key, dto);
  }

  @Get('health')
  getHealth() {
    return this.systemConfigService.checkAllHealth();
  }

  @Get('health/devices/:key')
  checkDeviceHealth(@Param('key') key: string) {
    return this.systemConfigService.checkDeviceHealth(key);
  }

  @Get('health/services/:key')
  checkServiceHealth(@Param('key') key: string) {
    return this.systemConfigService.checkServiceHealth(key);
  }
}
