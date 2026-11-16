import { Injectable, NotFoundException } from '@nestjs/common';

import { TscPrinterClient } from '../transport/tsc-printer.client';
import { buildMixingLabel } from '../tspl/mixing.template';
import { MixingLabelData } from '../types/mixing-label-data';
import { PRINTERS } from '../config/printer.config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MixingPrinterService {
  constructor(
    private readonly tscPrinterClient: TscPrinterClient,
    private readonly prisma: PrismaService
  ) {}

  async printMasterBatch(
    data: Omit<MixingLabelData, 'labelType' | 'completedAt'>
  ): Promise<void> {
    const masterBatch = await this.prisma.masterBatch.findUnique({
      where: {
        qrId: data.qrId,
      },
      select: {
        createdAt: true,
      },
    });

    if (!masterBatch) {
      throw new NotFoundException(
        `Master Batch not found for QR: ${data.qrId}`
      );
    }

    const tspl = buildMixingLabel({
      ...data,
      labelType: 'MASTER',
      completedAt: masterBatch.createdAt,
    });

    const printer = PRINTERS.mixing;

    await this.tscPrinterClient.send(printer.ip, printer.port, tspl);
  }

  async printFinalBatch(
    data: Omit<MixingLabelData, 'labelType' | 'completedAt'>
  ): Promise<void> {
    const finalBatch = await this.prisma.finalBatch.findUnique({
      where: {
        qrId: data.qrId,
      },
      select: {
        createdAt: true,
      },
    });

    if (!finalBatch) {
      throw new NotFoundException(`Final Batch not found for QR: ${data.qrId}`);
    }

    const tspl = buildMixingLabel({
      ...data,
      labelType: 'FINAL',
      completedAt: finalBatch.createdAt,
    });

    const printer = PRINTERS.mixing;

    await this.tscPrinterClient.send(printer.ip, printer.port, tspl);
  }
}
