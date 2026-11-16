import { Module } from '@nestjs/common';

import { SystemStatusController } from './system-status.controller';
import { SystemStatusService } from './system-status.service';
import { PrinterStatusService } from '../printer/printer-status.service';

@Module({
  controllers: [SystemStatusController],

  providers: [SystemStatusService, PrinterStatusService],
})
export class SystemStatusModule {}
