import { Controller, Get } from '@nestjs/common';

import { SystemStatusService } from './system-status.service';

@Controller('system-status')
export class SystemStatusController {
  constructor(private readonly systemStatusService: SystemStatusService) {}

  @Get()
  getStatus() {
    return this.systemStatusService.getStatus();
  }
}
