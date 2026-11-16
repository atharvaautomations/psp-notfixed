import { Injectable, NotFoundException } from '@nestjs/common';
import * as net from 'net';

import { PrismaService } from '../prisma/prisma.service';

import { UpdateDeviceDto } from './dto/update-device.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

import { HealthResult } from './system-health.types';

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getDevices() {
    return this.prisma.systemDevice.findMany({
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async getDevice(key: string) {
    const device = await this.prisma.systemDevice.findUnique({
      where: {
        key,
      },
    });

    if (!device) {
      throw new NotFoundException('System device not found');
    }

    return device;
  }

  async updateDevice(key: string, dto: UpdateDeviceDto) {
    await this.getDevice(key);

    return this.prisma.systemDevice.update({
      where: {
        key,
      },
      data: dto,
    });
  }

  async getServices() {
    return this.prisma.systemService.findMany({
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async getService(key: string) {
    const service = await this.prisma.systemService.findUnique({
      where: {
        key,
      },
    });

    if (!service) {
      throw new NotFoundException('System service not found');
    }

    return service;
  }

  async updateService(key: string, dto: UpdateServiceDto) {
    await this.getService(key);

    return this.prisma.systemService.update({
      where: {
        key,
      },
      data: dto,
    });
  }

  async getSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: {
        key: 'asc',
      },
    });
  }

  async updateSetting(key: string, dto: UpdateSettingDto) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: {
        key,
      },
    });

    if (!setting) {
      throw new NotFoundException('System setting not found');
    }

    return this.prisma.systemSetting.update({
      where: {
        key,
      },
      data: dto,
    });
  }

  private checkTcpConnection(
    host: string,
    port: number,
    timeout = 3000
  ): Promise<{
    success: boolean;
    responseTimeMs: number;
    message?: string;
  }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      const startedAt = Date.now();
      let finished = false;

      const finish = (success: boolean, message?: string) => {
        if (finished) {
          return;
        }

        finished = true;

        const responseTimeMs = Date.now() - startedAt;

        socket.destroy();

        resolve({
          success,
          responseTimeMs,
          message,
        });
      };

      socket.setTimeout(timeout);

      socket.once('connect', () => {
        finish(true, 'Connection successful');
      });

      socket.once('timeout', () => {
        finish(false, 'Connection timed out');
      });

      socket.once('error', (error) => {
        finish(false, error.message);
      });

      socket.connect(port, host);
    });
  }

  async checkDeviceHealth(key: string): Promise<HealthResult> {
    const device = await this.getDevice(key);

    const checkedAt = new Date();

    if (!device.enabled) {
      return {
        key: device.key,
        name: device.name,
        category: 'DEVICE',
        status: 'DISABLED',
        host: device.host,
        port: device.port,
        responseTimeMs: null,
        checkedAt,
        message: 'Device is disabled',
      };
    }

    if (!device.port) {
      return {
        key: device.key,
        name: device.name,
        category: 'DEVICE',
        status: 'WARNING',
        host: device.host,
        port: device.port,
        responseTimeMs: null,
        checkedAt,
        message: 'No port configured',
      };
    }

    const result = await this.checkTcpConnection(device.host, device.port);

    return {
      key: device.key,
      name: device.name,
      category: 'DEVICE',
      status: result.success ? 'ONLINE' : 'OFFLINE',
      host: device.host,
      port: device.port,
      responseTimeMs: result.responseTimeMs,
      checkedAt,
      message: result.message,
    };
  }

  private async checkDatabaseHealth(service: {
    key: string;
    name: string;
    host: string;
    port: number;
    enabled: boolean;
  }): Promise<HealthResult> {
    const startedAt = Date.now();
    const checkedAt = new Date();

    if (!service.enabled) {
      return {
        key: service.key,
        name: service.name,
        category: 'SERVICE',
        status: 'DISABLED',
        host: service.host,
        port: service.port,
        responseTimeMs: null,
        checkedAt,
        message: 'Service is disabled',
      };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        key: service.key,
        name: service.name,
        category: 'SERVICE',
        status: 'ONLINE',
        host: service.host,
        port: service.port,
        responseTimeMs: Date.now() - startedAt,
        checkedAt,
        message: 'Database query successful',
      };
    } catch (error) {
      return {
        key: service.key,
        name: service.name,
        category: 'SERVICE',
        status: 'OFFLINE',
        host: service.host,
        port: service.port,
        responseTimeMs: Date.now() - startedAt,
        checkedAt,
        message:
          error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  async checkServiceHealth(key: string): Promise<HealthResult> {
    const service = await this.getService(key);

    const checkedAt = new Date();

    if (!service.enabled) {
      return {
        key: service.key,
        name: service.name,
        category: 'SERVICE',
        status: 'DISABLED',
        host: service.host,
        port: service.port,
        responseTimeMs: null,
        checkedAt,
        message: 'Service is disabled',
      };
    }

    if (service.key === 'BACKEND') {
      return {
        key: service.key,
        name: service.name,
        category: 'SERVICE',
        status: 'ONLINE',
        host: service.host,
        port: service.port,
        responseTimeMs: 0,
        checkedAt,
        message: 'Backend is running',
      };
    }

    if (service.key === 'DATABASE') {
      return this.checkDatabaseHealth(service);
    }

    const result = await this.checkTcpConnection(service.host, service.port);

    return {
      key: service.key,
      name: service.name,
      category: 'SERVICE',
      status: result.success ? 'ONLINE' : 'OFFLINE',
      host: service.host,
      port: service.port,
      responseTimeMs: result.responseTimeMs,
      checkedAt,
      message: result.message,
    };
  }

  async checkAllHealth() {
    const [devices, services] = await Promise.all([
      this.getDevices(),
      this.getServices(),
    ]);

    const deviceHealth = await Promise.all(
      devices.map((device) => this.checkDeviceHealth(device.key))
    );

    const serviceHealth = await Promise.all(
      services.map((service) => this.checkServiceHealth(service.key))
    );

    const all = [...deviceHealth, ...serviceHealth];

    const online = all.filter((item) => item.status === 'ONLINE').length;

    const offline = all.filter((item) => item.status === 'OFFLINE').length;

    const warning = all.filter((item) => item.status === 'WARNING').length;

    const disabled = all.filter((item) => item.status === 'DISABLED').length;

    let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';

    if (offline > 0) {
      overallStatus = 'CRITICAL';
    } else if (warning > 0) {
      overallStatus = 'WARNING';
    } else {
      overallStatus = 'HEALTHY';
    }

    return {
      overallStatus,

      summary: {
        total: all.length,
        online,
        offline,
        warning,
        disabled,
      },

      devices: deviceHealth,
      services: serviceHealth,

      checkedAt: new Date(),
    };
  }
}
