import { Module } from '@nestjs/common';

import { PrinterController } from './printer.controller';
import { PrinterService } from './printer.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';

import { TscPrinterClient } from './transport/tsc-printer.client';

import { PrinterStatusService } from './services/printer-status.service';
import { InwardPrinterService } from './services/inward-printer.service';
import { WeighingPrinterService } from './services/weighing-printer.service';
import { MixingPrinterService } from './services/mixing-printer.service';
import { QcPrinterService } from './services/qc-printer.service';

import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ActivityLogModule],
  controllers: [PrinterController],

  providers: [
    PrismaService,
    PrinterService,
    WeighingPrinterService,
    InwardPrinterService,
    PrinterStatusService,
    TscPrinterClient,
    MixingPrinterService,
    QcPrinterService,
  ],

  exports: [PrinterService],
})
export class PrinterModule {}
