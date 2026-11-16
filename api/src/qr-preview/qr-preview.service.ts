import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QrPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async findByQrId(qrId: string) {
    const cleanQrId = qrId.trim();

    // ------------------------------------------------
    // 1. INWARD MATERIAL QR
    // ------------------------------------------------

    const inwardQr = await this.prisma.inwardQrCode.findUnique({
      where: {
        qrId: cleanQrId,
      },
      include: {
        inward: true,
      },
    });

    if (inwardQr) {
      const outward = inwardQr.outwardId
        ? await this.prisma.outwardEntry.findUnique({
            where: {
              id: inwardQr.outwardId,
            },
          })
        : null;

      return {
        type: 'INWARD_MATERIAL',

        qrId: inwardQr.qrId,
        status: inwardQr.state,

        materialName: inwardQr.inward.materialName,
        supplierName: inwardQr.inward.supplierName,
        batchNumber: inwardQr.inward.batchNumber,

        inwardQuantity: inwardQr.inward.quantity,
        unit: inwardQr.inward.unit,
        bagWeight: inwardQr.inward.bagWeight,
        bagNumber: inwardQr.bagNo,

        manufacturingDate: inwardQr.inward.mfgDate,
        expiryDate: inwardQr.inward.expDate,
        inwardDate: inwardQr.inward.createdAt,

        outward: outward
          ? {
              outwardId: outward.id,
              quantity: outward.quantity,
              issuedTo: outward.issuedTo,
              purpose: outward.purpose,
              date: outward.date,
              status: outward.status,
            }
          : null,

        scannedAtOutward: inwardQr.scannedAtOutward,
        scannedAtProduction: inwardQr.scannedAtProduction,
        consumedAt: inwardQr.consumedAt,
      };
    }

    // ------------------------------------------------
    // 2. EXECUTION INGREDIENT QR
    // ------------------------------------------------

    const executionIngredient =
      await this.prisma.executionIngredient.findUnique({
        where: {
          qrId: cleanQrId,
        },
        include: {
          executionBatch: {
            include: {
              execution: true,
            },
          },
        },
      });

    if (executionIngredient) {
      return {
        type: 'EXECUTION_INGREDIENT',

        qrId: executionIngredient.qrId,
        status: executionIngredient.status,

        ingredientName: executionIngredient.ingredientName,
        ingredientCode: executionIngredient.ingredientCode,
        materialName: executionIngredient.materialName,
        ingredientType: executionIngredient.ingredientType,

        executionCode:
          executionIngredient.executionBatch.execution.executionCode,

        recipeCode: executionIngredient.executionBatch.execution.recipeCode,

        recipeName: executionIngredient.executionBatch.execution.recipeName,

        batchNumber: executionIngredient.executionBatch.batchNumber,

        batchType: executionIngredient.batchType,

        process: executionIngredient.stepType,
        sequence: executionIngredient.stepSequence,

        expectedQuantity: executionIngredient.expectedQuantity,
        actualQuantity: executionIngredient.actualQuantity,
        tolerance: executionIngredient.tolerance,

        weighedAt: executionIngredient.weighedAt,
        completedAt: executionIngredient.completedAt,

        kneaderScanned: executionIngredient.kneaderScanned,
        mixingScanned: executionIngredient.mixingScanned,
      };
    }

    // ------------------------------------------------
    // 3. MASTER BATCH QR
    // ------------------------------------------------

    const masterBatch = await this.prisma.masterBatch.findUnique({
      where: {
        qrId: cleanQrId,
      },
      include: {
        recipe: true,
        executionBatch: {
          include: {
            execution: true,
          },
        },
      },
    });

    if (masterBatch) {
      return {
        type: 'MASTER_BATCH',

        qrId: masterBatch.qrId,
        status: masterBatch.status,

        recipeCode: masterBatch.recipe.recipeCode,
        recipeName: masterBatch.recipe.name,

        executionCode: masterBatch.executionBatch.execution.executionCode,

        batchNumber: masterBatch.executionBatch.batchNumber,

        createdAt: masterBatch.createdAt,
        consumedAt: masterBatch.consumedAt,
      };
    }

    // ------------------------------------------------
    // 4. FINAL BATCH QR
    // ------------------------------------------------

    const finalBatch = await this.prisma.finalBatch.findUnique({
      where: {
        qrId: cleanQrId,
      },
      include: {
        recipe: true,
        executionBatch: {
          include: {
            execution: true,
          },
        },
      },
    });

    if (finalBatch) {
      return {
        type: 'FINAL_BATCH',

        qrId: finalBatch.qrId,
        status: finalBatch.status,

        recipeCode: finalBatch.recipe.recipeCode,
        recipeName: finalBatch.recipe.name,

        executionCode: finalBatch.executionBatch.execution.executionCode,

        batchNumber: finalBatch.executionBatch.batchNumber,

        createdAt: finalBatch.createdAt,
        consumedAt: finalBatch.consumedAt,
      };
    }

    // ------------------------------------------------
    // NOT FOUND
    // ------------------------------------------------

    throw new NotFoundException(`No record found for QR ID ${cleanQrId}`);
  }
}
