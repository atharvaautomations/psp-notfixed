import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQcSpecificationDto } from './dto/create-qc-specification.dto';
import { UpdateQcSpecificationDto } from './dto/update-qc-specification.dto';
import { ScanQcDto } from './dto/scan-qc.dto';
import { CreateQcInspectionDto } from './dto/create-qc-inspection.dto';
import { SaveQcLabelInfoDto } from './dto/save-qc-label.dto';
import { CreateRetestAuditDto } from './dto/create-retest-audit.dto';
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

    let specification = await this.prisma.qcSpecification.findUnique({
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

    // If parameters array is empty, auto-seed default parameters from specification values
    if (specification.parameters.length === 0) {
      const defaultParams = [
        { name: 'Hardness', unit: 'Shore A', targetValue: specification.hardness ?? 60, displayOrder: 1, isDependentOnElongation: false },
        { name: 'Specific Gravity', unit: 'g/cm³', targetValue: specification.specificGravity ?? 1.2, displayOrder: 2, isDependentOnElongation: false },
        { name: 'Tensile Strength', unit: 'MPa', targetValue: specification.tensile ?? 15, displayOrder: 3, isDependentOnElongation: false },
        { name: 'Elongation at Break', unit: '%', targetValue: specification.elongation ?? 300, displayOrder: 4, isDependentOnElongation: false },
        { name: 'Rheometer', unit: 'dN·m', testMethod: 'ASTM D5289', targetValue: undefined, tolerance: undefined, toleranceType: undefined, displayOrder: 5, isDependentOnElongation: false },
        { name: 'Rheometer ML', unit: 'dN·m', testMethod: 'ASTM D5289', targetValue: 2.7, tolerance: 0.75, toleranceType: 'ABSOLUTE', displayOrder: 6, isDependentOnElongation: true },
        { name: 'Rheometer MH', unit: 'dN·m', testMethod: 'ASTM D5289', targetValue: 17.5, tolerance: 2.5, toleranceType: 'ABSOLUTE', displayOrder: 7, isDependentOnElongation: true },
        { name: 'Scorch Time TS2', unit: 'min', testMethod: 'ASTM D5289', targetValue: 1.5, tolerance: 0.3, toleranceType: 'ABSOLUTE', displayOrder: 8, isDependentOnElongation: true },
        { name: 'Cure Time TC90', unit: 'min', testMethod: 'ASTM D5289', targetValue: 5.0, tolerance: 1.0, toleranceType: 'ABSOLUTE', displayOrder: 9, isDependentOnElongation: true },
        { name: 'Compression Set', unit: '%', targetValue: specification.compressionSet ?? 25, displayOrder: 10, isDependentOnElongation: false },
      ];

      for (const p of defaultParams) {
        await this.prisma.qcSpecificationParameter.create({
          data: {
            specificationId: specification.id,
            name: p.name,
            unit: p.unit,
            testMethod: p.testMethod,
            targetValue: p.targetValue,
            tolerance: p.tolerance,
            toleranceType: p.toleranceType,
            displayOrder: p.displayOrder,
            isEnabled: true,
            isDependentOnElongation: p.isDependentOnElongation,
          },
        });
      }

      specification = await this.prisma.qcSpecification.findUnique({
        where: { id: specification.id },
        include: {
          parameters: { orderBy: { displayOrder: 'asc' } },
        },
      }) as typeof specification;
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
      // Skip Rheometer parent - it's a category header, not a measurable parameter
      if (param.specificationParameterId) {
        const specParam = await this.prisma.qcSpecificationParameter.findUnique({
          where: { id: param.specificationParameterId },
        });
        if (specParam && specParam.name === 'Rheometer') continue;
      }

      if (!param.actualValue || param.actualValue.trim() === '') {
        throw new BadRequestException(
          'All enabled parameters must have a valid actual value.'
        );
      }
      if (!param.result) {
        throw new BadRequestException(
          'All enabled parameters must have a result (PASS or FAIL).'
        );
      }
    }

    // Calculate overall result: if ANY enabled parameter is FAIL -> FAIL; else PASS
    const overallResult = this.calculateOverallResult(
      enabledParams.map((p) => p.result!) as QcParameterResult[]
    );

    // Check if this is a RETEST of an existing inspection
    if (dto.inspectionId) {
      const existingInspection = await this.prisma.qcInspection.findUnique({
        where: { id: dto.inspectionId },
        include: { parameters: true },
      });

      if (!existingInspection) {
        throw new BadRequestException('Original inspection for retest not found.');
      }

      if (existingInspection.finalBatchId !== dto.finalBatchId) {
        throw new BadRequestException('Inspection ID does not match the provided final batch ID.');
      }

      if (existingInspection.remarks?.includes('[RETESTED]')) {
        throw new BadRequestException(
          'This QC inspection has already been retested once. Only one retest is allowed. The inspection remains in its final status.'
        );
      }

      // Update the existing inspection with retest results
      const updatedRemarks = dto.remarks
        ? `${dto.remarks.replace(/\[RETESTED\]/g, '').trim()} [RETESTED]`
        : '[RETESTED]';

      const updatedInspection = await this.prisma.$transaction(async (tx) => {
        // Delete old parameters for this inspection
        await tx.qcInspectionParameter.deleteMany({
          where: { inspectionId: existingInspection.id },
        });

        // Update inspection and create new parameters
        return tx.qcInspection.update({
          where: { id: existingInspection.id },
          data: {
            overallResult,
            status: overallResult === 'PASS' ? QcStatus.PASS : QcStatus.FAIL,
            remarks: updatedRemarks,
            testedAt: new Date(),
            inspectedById: userId,
            parameters: {
              create: dto.parameters.map((param) => ({
                specificationParameter: {
                  connect: { id: param.specificationParameterId },
                },
                actualValue: param.actualValue as any,
                result: param.result,
                observations: param.observations || '',
                isEnabled: param.isEnabled ?? true,
              })),
            },
          },
          include: {
            finalBatch: { include: { recipe: true, executionBatch: { include: { execution: true } } } },
            qcSpecification: true,
            parameters: { include: { specificationParameter: true } },
            files: true,
          },
        });
      });

      return {
        message: `QC Retest saved successfully. Overall Result: ${updatedInspection.overallResult}`,
        inspection: updatedInspection,
      };
    }

    // Create fresh inspection with parameters in transaction
    const inspection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.qcInspection.create({
        data: {
          finalBatchId: dto.finalBatchId,
          qcSpecificationId: specification.id,
          inspectedById: userId,
          overallResult,
          remarks: dto.remarks || '',
          status: overallResult === 'PASS' ? QcStatus.PASS : QcStatus.FAIL,
          parameters: {
            create: dto.parameters.map((param) => ({
              specificationParameter: {
                connect: { id: param.specificationParameterId },
              },
              actualValue: param.actualValue as any,
              result: param.result,
              observations: param.observations || '',
              isEnabled: param.isEnabled ?? true,
            })),
          },
        },
        include: {
          finalBatch: { include: { recipe: true, executionBatch: { include: { execution: true } } } },
          qcSpecification: true,
          parameters: { include: { specificationParameter: true } },
          files: true,
        },
      });

      return created;
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
        parameters: {
          include: {
            specificationParameter: true,
          },
        },
        files: true,
        retestAudits: true,
        labelInfo: true,
      },
      orderBy: {
        testedAt: 'desc',
      },
    });
  }

  async findInspectionById(id: number) {
    return this.prisma.qcInspection.findUnique({
      where: { id },
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
        parameters: {
          include: {
            specificationParameter: true,
          },
        },
        files: true,
        retestAudits: true,
        labelInfo: true,
      },
    });
  }

  async saveLabelInfo(dto: SaveQcLabelInfoDto, userId: number) {
    const finalBatch = await this.prisma.finalBatch.findUnique({
      where: { id: dto.finalBatchId },
      include: { recipe: true },
    });

    if (!finalBatch) {
      throw new BadRequestException('Final Batch not found.');
    }

    if (dto.qcInspectionId) {
      const inspection = await this.prisma.qcInspection.findUnique({
        where: { id: dto.qcInspectionId },
      });

      if (!inspection) {
        throw new BadRequestException('QC Inspection not found.');
      }

      if (inspection.finalBatchId !== dto.finalBatchId) {
        throw new BadRequestException(
          'Inspection ID does not match the provided final batch ID.'
        );
      }
    }

    const batchNumber = finalBatch.qrId?.split('-').pop() ?? '';

    return await this.prisma.qcLabelInfo.create({
      data: {
        finalBatchId: dto.finalBatchId,
        qcInspectionId: dto.qcInspectionId ?? null,
        customerName: dto.customerName,
        partName: dto.partName,
        partNumber: dto.partNumber,
        expiryDate: new Date(dto.expiryDate),
        compoundName: dto.compoundName,
        batchNumber,
        mixingDate: finalBatch.mixingCompletedAt ?? null,
        shift: finalBatch.shift ?? null,
        qcStatus: dto.qcStatus,
      },
    });
  }

  async findLabelInfo(finalBatchId: number) {
    return this.prisma.qcLabelInfo.findFirst({
      where: { finalBatchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRetestAudit(dto: CreateRetestAuditDto, userId: number) {
    const inspection = await this.prisma.qcInspection.findUnique({
      where: { id: dto.qcInspectionId },
    });

    if (!inspection) {
      throw new BadRequestException('QC Inspection not found.');
    }

    return await this.prisma.qcRetestAudit.create({
      data: {
        qcInspectionId: dto.qcInspectionId,
        stage: dto.stage,
        deviation: dto.deviation,
        reason: dto.reason,
        actionTaken: dto.actionTaken,
        approvedBy: dto.approvedBy,
      },
    });
  }

  async findRetestAudit(inspectionId: number) {
    return this.prisma.qcRetestAudit.findFirst({
      where: { qcInspectionId: inspectionId },
      orderBy: { dateTime: 'desc' },
    });
  }
}
