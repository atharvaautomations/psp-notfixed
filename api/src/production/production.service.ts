import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { QrState } from '@prisma/client';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService
  ) {}

  private async safeLog(
    data: Parameters<ActivityLogService['log']>[0]
  ): Promise<void> {
    try {
      await this.activityLog.log(data);
    } catch (error) {
      // Logging must never break QR scanning.
      console.error('Activity log failed for production scan:', error);
    }
  }

  async scanQr(qrId: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
      const qr = await tx.inwardQrCode.findUnique({
        where: { qrId },
        include: {
          inward: true,
        },
      });

      if (!qr) {
        throw new NotFoundException('Invalid QR ID');
      }

      if (qr.state !== QrState.ISSUED) {
        throw new BadRequestException('QR must be in ISSUED state to consume.');
      }

      const materialName = qr.inward.materialName;

      const ingredient = await tx.ingredient.findFirst({
        where: { materialName },
      });

      if (!ingredient) {
        throw new NotFoundException(
          `No ingredient mapping found for ${materialName}.`
        );
      }

      const bin = await tx.binAssignment.findUnique({
        where: {
          ingredientId: ingredient.id,
        },
      });

      if (!bin) {
        throw new NotFoundException(
          `No bin assigned for ingredient ${ingredient.ingredientCode}.`
        );
      }

      // Inward/bin stock is maintained in KG.
      const bagWeightKg = qr.inward.bagWeight || 0;

      if (bagWeightKg <= 0) {
        throw new BadRequestException(`Invalid bag weight for QR ${qrId}.`);
      }

      const newQty = bin.currentQuantity + bagWeightKg;

      if (newQty > bin.maxQuantity) {
        throw new BadRequestException(
          `Cannot add ${bagWeightKg} KG to bin ${bin.binNumber}. Exceeds max capacity (${bin.maxQuantity} KG).`
        );
      }

      // Update bin quantity first inside the same transaction.
      await tx.binAssignment.update({
        where: {
          id: bin.id,
        },
        data: {
          currentQuantity: newQty,
        },
      });

      // Mark QR consumed only if both scans are complete (outward + production).
      // If only production scan happened without outward, keep it printable.
      const qrBefore = await tx.inwardQrCode.findUnique({
        where: { qrId },
        select: { state: true, scannedAtOutward: true },
      });

      await tx.inwardQrCode.update({
        where: {
          qrId,
        },
        data: {
          state:
            qrBefore?.state === QrState.ISSUED || qrBefore?.scannedAtOutward
              ? QrState.CONSUMED
              : QrState.ISSUED,
          scannedAtProduction: new Date(),
        },
      });

      const binNumber = Number(bin.binNumber.replace('B', ''));

      return {
        message: `QR ${qrId} consumed successfully and ${bagWeightKg} KG added to ${bin.binNumber}.`,
        binNumber,
        newQuantity: newQty,
        ingredient: ingredient.name || ingredient.ingredientCode,
      };
      });

      await this.safeLog({
        moduleType: 'production',
        activityType: 'qr_scan',
        qrId,
        binNumber: String(result.binNumber),
        status: 'Success',
        metadata: {
          binNumber: result.binNumber,
          newQuantity: result.newQuantity,
          ingredient: result.ingredient,
        },
      });

      return result;
    } catch (error) {
      await this.safeLog({
        moduleType: 'production',
        activityType: 'qr_scan',
        qrId,
        status: 'Failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
