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
        mixingCompletedAt: true,
        shift: true,
        expiryDate: true,
        executionBatch: {
          select: {
            execution: {
              select: {
                productionBatchNumber: true,
              },
            },
          },
        },
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

    // Fetch label info if available
    const labelInfo = await this.prisma.qcLabelInfo.findFirst({
      where: { finalBatchId: finalBatch.id },
      orderBy: { createdAt: 'desc' },
    });

    const completedAt = finalBatch.mixingCompletedAt ?? qcInspection.testedAt;

    const tspl = buildQcLabel({
      ...data,
      completedAt,
      batchNumber: finalBatch.executionBatch?.execution?.productionBatchNumber ?? String(data.batchNumber ?? ''),
      mixingDate: finalBatch.mixingCompletedAt ? formatDate(finalBatch.mixingCompletedAt) : undefined,
      shift: finalBatch.shift ?? undefined,
      expiryDate: labelInfo?.expiryDate ? formatDate(labelInfo.expiryDate) : data.expiryDate,
      customerName: labelInfo?.customerName ?? data.customerName,
      partName: labelInfo?.partName ?? data.partName,
      partNumber: labelInfo?.partNumber ?? data.partNumber,
      compoundName: labelInfo?.compoundName ?? data.compoundName,
    });

    const printer = PRINTERS.qc;

    await this.tscPrinterClient.send(printer.ip, printer.port, tspl);
  }
}

function formatDate(value: Date): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}