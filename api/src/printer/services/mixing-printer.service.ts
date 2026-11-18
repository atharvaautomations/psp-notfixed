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
    data: Omit<MixingLabelData, 'labelType' | 'completedAt' | 'productionBatchNumber' | 'compoundName' | 'mixingDate' | 'mixingTime' | 'shift' | 'expiryDate'>
  ): Promise<void> {
    const finalBatch = await this.prisma.finalBatch.findUnique({
      where: {
        qrId: data.qrId,
      },
      select: {
        createdAt: true,
        mixingCompletedAt: true,
        shift: true,
        expiryDate: true,
        executionBatch: {
          select: {
            execution: {
              select: {
                productionBatchNumber: true,
                recipe: {
                  select: {
                    finalBatchCompoundName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!finalBatch) {
      throw new NotFoundException(`Final Batch not found for QR: ${data.qrId}`);
    }

    const completedAt = finalBatch.mixingCompletedAt ?? finalBatch.createdAt;
    const mixingDate = completedAt ? formatDate(completedAt) : '';
    const mixingTime = completedAt ? formatTime(completedAt) : '';

    const tspl = buildMixingLabel({
      ...data,
      labelType: 'FINAL',
      completedAt: finalBatch.createdAt,
      productionBatchNumber: finalBatch.executionBatch?.execution?.productionBatchNumber ?? undefined,
      compoundName: finalBatch.executionBatch?.execution?.recipe?.finalBatchCompoundName ?? undefined,
      mixingDate,
      mixingTime,
      shift: finalBatch.shift ?? undefined,
      expiryDate: finalBatch.expiryDate ? formatDate(finalBatch.expiryDate) : undefined,
    });

    const printer = PRINTERS.mixing;

    await this.tscPrinterClient.send(printer.ip, printer.port, tspl);
  }
}

function formatDate(value: Date | string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(value: Date | string): string {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
