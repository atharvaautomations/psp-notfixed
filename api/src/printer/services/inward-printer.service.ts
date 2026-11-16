import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { TscPrinterClient } from '../transport/tsc-printer.client';
import { PRINTERS } from '../config/printer.config';
import { PrinterLabelData } from '../types/printer-label-data';
import { generateTSPL, getJulianDate } from '../tspl/inward.template';

@Injectable()
export class InwardPrinterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tscPrinterClient: TscPrinterClient,
    private readonly activityLog: ActivityLogService
  ) {}

  private async safeLog(
    data: Parameters<ActivityLogService['log']>[0]
  ): Promise<void> {
    try {
      await this.activityLog.log(data);
    } catch (error) {
      // Logging must never break label printing.
      console.error('Activity log failed for label print:', error);
    }
  }

  async printLabel(qrId: string): Promise<void> {
    try {
      const labelData = await this.getLabelData(qrId);
      const tspl = generateTSPL(labelData);

      const printer = PRINTERS.inward;

      await this.tscPrinterClient.send(printer.ip, printer.port, tspl);
    } catch (error) {
      await this.safeLog({
        moduleType: 'printer',
        activityType: 'label_print',
        qrId,
        status: 'Failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    await this.safeLog({
      moduleType: 'printer',
      activityType: 'label_print',
      qrId,
      status: 'Success',
    });
  }

  async printBatch(qrCodes: Array<{ qrId: string }>): Promise<number> {
    // Consumed labels can never be reprinted, even if a stale UI asks for it.
    const existing = await this.prisma.inwardQrCode.findMany({
      where: { qrId: { in: qrCodes.map((qr) => qr.qrId) } },
      select: { qrId: true, state: true },
    });
    const consumed = new Set(
      existing
        .filter((qr) => qr.state === 'CONSUMED')
        .map((qr) => qr.qrId)
    );

    let printed = 0;
    for (const qr of qrCodes) {
      if (consumed.has(qr.qrId)) {
        await this.safeLog({
          moduleType: 'printer',
          activityType: 'label_print',
          qrId: qr.qrId,
          status: 'Failed',
          errorMessage: 'Label is consumed and cannot be printed.',
        });
        continue;
      }

      await this.printLabel(qr.qrId);
      printed += 1;
      // Small delay between prints
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return printed;
  }

  private async getLabelData(qrId: string): Promise<PrinterLabelData> {
    const qr = await this.prisma.inwardQrCode.findUnique({
      where: { qrId },
      select: {
        qrId: true,
        state: true,
        bagNo: true,
        inward: {
          select: {
            id: true,
            materialName: true,
            batchNumber: true,
            batchDate: true,
            grnNumber: true,
            grnDate: true,
            supplierName: true,
            bagWeight: true,
            quantity: true,
            unit: true,
            shelfLife: true,
            mfgDate: true,
            expDate: true,
            storedAsWhole: true,
          },
        },
      },
    });

    if (!qr?.inward) {
      throw new Error(`No inward record found for QR ${qrId}`);
    }

    if (qr.state === 'CONSUMED') {
      throw new BadRequestException(
        `Label for QR ${qrId} is consumed and cannot be printed.`
      );
    }

    return {
      qrId,
      inwardId: qr.inward.id,
      materialName: qr.inward.materialName,
      batchNumber: qr.inward.batchNumber,
      batchDate: qr.inward.batchDate,
      grnNumber: qr.inward.grnNumber,
      grnDate: qr.inward.grnDate,
      supplierName: qr.inward.supplierName,
      bagWeight: qr.inward.bagWeight,
      quantity: qr.inward.quantity,
      unit: qr.inward.unit,
      shelfLife: qr.inward.shelfLife,
      mfgDate: qr.inward.mfgDate,
      expDate: qr.inward.expDate,
      storedAsWhole: qr.inward.storedAsWhole,
      bagNumber: qr.bagNo ?? undefined,
      julianDate: getJulianDate(new Date()),
    };
  }
}
