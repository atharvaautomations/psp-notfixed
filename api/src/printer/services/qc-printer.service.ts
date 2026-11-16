import { Injectable, NotFoundException } from '@nestjs/common';

import { TscPrinterClient } from '../transport/tsc-printer.client';
import { buildQcLabel, QcLabelData } from '../tspl/qc.template';
import { PRINTERS } from '../config/printer.config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QcPrinterService {
  constructor(
    private readonly tscPrinterClient: TscPrinterClient,
    private readonly prisma: PrismaService
  ) {}

  async printQcLabel(data: Omit<QcLabelData, 'completedAt'>): Promise<void> {
    const finalBatch = await this.prisma.finalBatch.findUnique({
      where: {
        qrId: data.qrId,
      },
      select: {
        id: true,
      },
    });

    if (!finalBatch) {
      throw new NotFoundException(`Final Batch not found for QR: ${data.qrId}`);
    }

    const qcInspection = await this.prisma.qcInspection.findFirst({
      where: {
        finalBatchId: finalBatch.id,
      },
      orderBy: {
        testedAt: 'desc',
      },
      select: {
        testedAt: true,
      },
    });

    if (!qcInspection) {
      throw new NotFoundException(
        `QC Inspection not found for QR: ${data.qrId}`
      );
    }

    const tspl = buildQcLabel({
      ...data,
      completedAt: qcInspection.testedAt,
    });

    const printer = PRINTERS.qc;

    await this.tscPrinterClient.send(printer.ip, printer.port, tspl);
  }
}
