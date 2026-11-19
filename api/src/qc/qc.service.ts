import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQcSpecificationDto } from './dto/create-qc-specification.dto';
import { UpdateQcSpecificationDto } from './dto/update-qc-specification.dto';
import { ScanQcDto } from './dto/scan-qc.dto';
import { CreateQcInspectionDto } from './dto/create-qc-inspection.dto';
import { QcStatus, QcParameterResult } from '@prisma/client';

@Injectable()
export class QcService {
  constructor(private readonly prisma: PrismaService) {}

  async createSpecification(dto: CreateQcSpecificationDto) {
    // Check recipe exists
    const recipe = await this.prisma.recipe.findUnique({
      where: {
        id: dto.recipeId,
      },
    });

    if (!recipe) {
      throw new BadRequestException('Recipe not found.');
    }

    // Prevent duplicate specification
    const existing = await this.prisma.qcSpecification.findUnique({
      where: {
        recipeId: dto.recipeId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'QC Specification already exists for this recipe.'
      );
    }

    const specification = await this.prisma.qcSpecification.create({
      data: dto,
      include: {
        recipe: true,
      },
    });

    return {
      message: 'QC Specification created successfully.',
      specification,
    };
  }

  async findAllSpecifications() {
    return this.prisma.qcSpecification.findMany({
      include: {
        recipe: true,
      },
      orderBy: {
        recipeId: 'asc',
      },
    });
  }

  async findSpecification(id: number) {
    const specification = await this.prisma.qcSpecification.findUnique({
      where: {
        id,
      },
      include: {
        recipe: true,
      },
    });

    if (!specification) {
      throw new BadRequestException('QC Specification not found.');
    }

    return specification;
  }

  async updateSpecification(id: number, dto: UpdateQcSpecificationDto) {
    const existing = await this.prisma.qcSpecification.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new BadRequestException('QC Specification not found.');
    }

    // If recipe is changed, ensure uniqueness
    if (dto.recipeId && dto.recipeId !== existing.recipeId) {
      const recipeExists = await this.prisma.recipe.findUnique({
        where: {
          id: dto.recipeId,
        },
      });

      if (!recipeExists) {
        throw new BadRequestException('Recipe not found.');
      }

      const duplicate = await this.prisma.qcSpecification.findUnique({
        where: {
          recipeId: dto.recipeId,
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'QC Specification already exists for this recipe.'
        );
      }
    }

    const specification = await this.prisma.qcSpecification.update({
      where: {
        id,
      },
      data: dto,
      include: {
        recipe: true,
      },
    });

    return {
      message: 'QC Specification updated successfully.',
      specification,
    };
  }

  async deleteSpecification(id: number) {
    const existing = await this.prisma.qcSpecification.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new BadRequestException('QC Specification not found.');
    }

    await this.prisma.qcSpecification.delete({
      where: {
        id,
      },
    });

    return {
      message: 'QC Specification deleted successfully.',
    };
  }

  async scanQr(dto: ScanQcDto) {
    const qrId = dto.qrId;

    // Check QR code type and provide helpful error
    if (qrId.startsWith('EI-')) {
      throw new BadRequestException(
        'Invalid QR code for QC scan. ExecutionIngredient QR codes (EI-...) are for ingredient tracking during weighing/mixing. Please scan the FinalBatch QR code (FB-...) for QC inspection.'
      );
    }
    if (qrId.startsWith('MB-')) {
      throw new BadRequestException(
        'Invalid QR code for QC scan. MasterBatch QR codes (MB-...) are for mixing process. Please scan the FinalBatch QR code (FB-...) for QC inspection.'
      );
    }
    if (qrId.startsWith('BW-')) {
      throw new BadRequestException(
        'Invalid QR code for QC scan. Weighing QR codes (BW-...) are for inward material. Please scan the FinalBatch QR code (FB-...) for QC inspection.'
      );
    }

    const finalBatch = await this.prisma.finalBatch.findUnique({
      where: {
        qrId,
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

    if (!finalBatch) {
      throw new BadRequestException(
        'Final Batch not found. Please ensure you are scanning a valid FinalBatch QR code (format: FB-{EXECUTION_CODE}-B{batchNum}).'
      );
    }

    const specification = await this.prisma.qcSpecification.findUnique({
      where: {
        recipeId: finalBatch.recipeId,
      },
      include: {
        parameters: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!specification) {
      throw new BadRequestException(
        'QC Specification not found for this recipe.'
      );
    }

    return {
      finalBatchId: finalBatch.id,
      qrId: finalBatch.qrId,

      recipe: finalBatch.recipe,

      batch: finalBatch.executionBatch,

      specification,
    };
  }

  async createInspection(dto: CreateQcInspectionDto, userId: number) {
    const finalBatch = await this.prisma.finalBatch.findUnique({
      where: {
        id: dto.finalBatchId,
      },
      include: { recipe: true },
    });

    if (!finalBatch) {
      throw new BadRequestException('Final Batch not found.');
    }

    const specification = await this.prisma.qcSpecification.findUnique({
      where: { recipeId: finalBatch.recipeId },
      include: { parameters: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!specification) {
      throw new BadRequestException('QC Specification not found for this recipe.');
    }

    // Filter enabled parameters
    const enabledParams = dto.parameters.filter((p) => p.isEnabled !== false);

    // Validate that at least one parameter is enabled
    if (enabledParams.length === 0) {
      throw new BadRequestException(
        'At least one test parameter must be enabled for inspection.'
      );
    }

    // Validate each enabled parameter
    for (const param of enabledParams) {
      if (param.actualValue === undefined || param.actualValue === null) {
        throw new BadRequestException(
          'All enabled parameters must have an actual value.'
        );
      }
      if (!param.result) {
        throw new BadRequestException(
          'All enabled parameters must have a result (PASS/FAIL/RETEST).'
        );
      }
      if ((param.result === 'FAIL' || param.result === 'RETEST') && !param.observations) {
        throw new BadRequestException(
          'Observations are required for FAIL or RETEST results.'
        );
      }
    }

    // Calculate overall result
    const overallResult = this.calculateOverallResult(
      enabledParams.map((p) => p.result!) as QcParameterResult[]
    );

    // Create inspection with parameters in transaction
    const inspection = await this.prisma.$transaction(async (tx) => {
      const inspection = await tx.qcInspection.create({
        data: {
          finalBatchId: dto.finalBatchId,
          qcSpecificationId: specification.id,
          inspectedById: userId,
          overallResult,
          remarks: dto.remarks,
          status: overallResult === 'PASS' ? QcStatus.PASS : QcStatus.FAIL, // legacy status
          parameters: {
            create: dto.parameters.map((param) => ({
              specificationParameterId: param.specificationParameterId,
              actualValue: param.actualValue,
              result: param.result,
              observations: param.observations,
              isEnabled: param.isEnabled ?? true,
            })),
          },
        },
        include: {
          finalBatch: { include: { recipe: true, executionBatch: { include: { execution: true } } } },
          qcSpecification: true,
          parameters: { include: { specificationParameter: true } },
        },
      });

      return inspection;
    });

    return {
      message: `QC Inspection saved successfully. Overall Result: ${inspection.overallResult}`,
      inspection,
    };
  }

  private calculateOverallResult(results: QcParameterResult[]): QcStatus {
    if (results.length === 0) return QcStatus.FAIL;

    // If any FAIL, overall is FAIL
    if (results.some((r) => r === QcParameterResult.FAIL)) return QcStatus.FAIL;

    // If any RETEST, overall is RETEST
    if (results.some((r) => r === QcParameterResult.RETEST)) return QcStatus.RETEST;

    // All PASS
    return QcStatus.PASS;
  }

  async findAllInspections() {
    return this.prisma.qcInspection.findMany({
      include: {
        finalBatch: {
          include: {
            recipe: true,
            executionBatch: {
              include: {
                execution: true,
              },
            },
          },
        },
      },
      orderBy: {
        testedAt: 'desc',
      },
    });
  }
}
