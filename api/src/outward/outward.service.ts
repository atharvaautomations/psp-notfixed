import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { OutwardEntry, QrState } from '@prisma/client';
import { CreateOutwardDto } from './dto/create-outward.dto';
import { Logger } from '@nestjs/common';
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  normalizeUnit,
  getBaseUnit,
  UnitType,
} from '../utils/unit-conversion';

@Injectable()
export class OutwardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService
  ) {}
  private readonly logger = new Logger(OutwardService.name);

  private async safeLog(
    data: Parameters<ActivityLogService['log']>[0]
  ): Promise<void> {
    try {
      await this.activityLog.log(data);
    } catch (error) {
      // Logging must never break outward operations.
      console.error('Activity log failed for outward operation:', error);
    }
  }

  private mapOutwardPermissions(outward: OutwardEntry) {
    const qrScanStatus = outward.qrScanStatus as {
      scannedBags?: number;
    } | null;

    const scannedBags = qrScanStatus?.scannedBags ?? 0;

    return {
      ...outward,
      canScan: outward.status !== 'Completed',
      canDelete: scannedBags === 0,
    };
  }

  async create(dto: CreateOutwardDto) {
    const issuedTo = dto.issuedTo.trim();

    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (!dto.inwardId) {
      throw new BadRequestException('Inward entry ID is required');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const inward = await tx.inwardEntry.findUnique({
        where: { id: dto.inwardId },
        include: { qrCodes: true },
      });

      if (!inward) {
        throw new BadRequestException('Inward entry not found');
      }

      if (dto.selectedQrIds && dto.selectedQrIds.length > 0) {
        const selectedQrs = await tx.inwardQrCode.findMany({
          where: { qrId: { in: dto.selectedQrIds } },
        });

        const invalidQrs = selectedQrs.filter(
          (qr) => qr.inwardId !== dto.inwardId
        );
        if (invalidQrs.length > 0) {
          throw new BadRequestException(
            `Selected QR codes do not belong to the selected material entry. Invalid QRs: ${invalidQrs
              .map((q) => q.qrId)
              .join(', ')}`
          );
        }

        const notCreatedQrs = selectedQrs.filter(
          (qr) => qr.state !== QrState.CREATED
        );
        if (notCreatedQrs.length > 0) {
          throw new BadRequestException(
            `Some selected bags are already reserved, issued or consumed: ${notCreatedQrs
              .map((q) => q.qrId)
              .join(', ')}`
          );
        }
      }

      let stock = await tx.materialStock.findFirst({
        where: {
          materialName: { equals: inward.materialName, mode: 'insensitive' },
          supplierName: { equals: inward.supplierName, mode: 'insensitive' },
        },
      });

      // Stock rows created before supplier separation have no supplier yet;
      // fall back to the material-level row instead of blocking dispatch.
      if (!stock) {
        stock = await tx.materialStock.findFirst({
          where: {
            materialName: { equals: inward.materialName, mode: 'insensitive' },
          },
        });
      }

      if (!stock) {
        throw new BadRequestException(
          `Material ${inward.materialName} from supplier ${inward.supplierName} not found in stock`
        );
      }

      const outwardUnit = normalizeUnit(dto.unit || inward.unit) as UnitType;
      const outwardBaseQty = convertToBaseUnit(dto.quantity, outwardUnit);
      const stockBaseQty = stock.baseQuantity ?? stock.totalQuantity;

      if (stockBaseQty < outwardBaseQty) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${stock.totalQuantity} ${stock.unit}`
        );
      }

      await tx.materialStock.update({
        where: { id: stock.id },
        data: {
          totalQuantity: { decrement: outwardBaseQty },
          baseQuantity: { decrement: outwardBaseQty },
          updatedAt: new Date(),
        },
      });

      const numBagsIssued = dto.selectedQrIds?.length || 0;
      const outward = await tx.outwardEntry.create({
        data: {
          materialName: inward.materialName,
          supplierName: inward.supplierName,
          quantity: dto.quantity,
          unit: outwardUnit,
          baseQuantity: outwardBaseQty,
          baseUnit: getBaseUnit(outwardUnit),
          issuedTo,
          purpose: dto.purpose ?? 'Production',
          remarks:
            dto.remarks ??
            `Issued from ${inward.supplierName} - ${inward.bagWeight}${inward.unit} bags`,
          status: 'Pending',
          bagsIssued: numBagsIssued,
          qrScanStatus: {
            totalBags: numBagsIssued,
            scannedBags: 0,
          },
        },
      });

      if (dto.selectedQrIds?.length) {
        await tx.inwardQrCode.updateMany({
          where: {
            qrId: {
              in: dto.selectedQrIds,
            },
          },
          data: {
            state: QrState.RESERVED,
            outwardId: outward.id,
          },
        });
      }

      return outward;
    });

    await this.safeLog({
      moduleType: 'outward',
      activityType: 'entry_creation',
      referenceId: created.id.toString(),
      status: 'Success',
      metadata: {
        materialName: created.materialName,
        supplierName: created.supplierName,
        quantity: created.quantity,
        unit: created.unit,
        issuedTo: created.issuedTo,
        bagsIssued: created.bagsIssued,
      },
    });

    return created;
  }

  async createFromRequisition(requisitionId: number, userInfo: { userId: number; username: string }) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    if (requisition.status !== 'Approved') {
      throw new BadRequestException('Only approved requisitions can create outward');
    }

    if (requisition.linkedOutwardId) {
      throw new BadRequestException('This requisition already has an outward linked');
    }

    if (!requisition.sourceInwardId) {
      throw new BadRequestException('Requisition has no source inward entry');
    }

    const inward = await this.prisma.inwardEntry.findUnique({
      where: { id: requisition.sourceInwardId },
      include: { qrCodes: true },
    });

    if (!inward) {
      throw new BadRequestException('Source inward entry not found');
    }

    const availableQrCodes = inward.qrCodes.filter(qr => qr.state === QrState.CREATED);
    const requiredBags = requisition.numberOfBags || Math.ceil(requisition.requiredQuantity / (inward.bagWeight || 1));

    if (availableQrCodes.length < requiredBags) {
      throw new BadRequestException(
        `Insufficient available bags. Required: ${requiredBags}, Available: ${availableQrCodes.length}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Create outward entry
      const outward = await tx.outwardEntry.create({
        data: {
          materialName: inward.materialName,
          supplierName: inward.supplierName,
          quantity: requisition.requiredQuantity,
          unit: requisition.unit,
          baseQuantity: requisition.baseQuantity ?? requisition.requiredQuantity,
          baseUnit: requisition.baseUnit ?? inward.unit,
          issuedTo: requisition.requestedBy,
          purpose: 'Production',
          remarks: `Outward created from requisition ${requisition.requisitionNumber} - ${requisition.materialName}`,
          status: 'Pending',
          bagsIssued: requiredBags,
          qrScanStatus: {
            totalBags: requiredBags,
            scannedBags: 0,
          },
        },
      });

      // Reserve QR codes for this outward
      const qrCodesToReserve = availableQrCodes.slice(0, requiredBags);
      await tx.inwardQrCode.updateMany({
        where: {
          qrId: { in: qrCodesToReserve.map(q => q.qrId) },
        },
        data: {
          state: QrState.RESERVED,
          outwardId: outward.id,
        },
      });

      // Link outward to requisition
      await tx.requisition.update({
        where: { id: requisitionId },
        data: {
          linkedOutwardId: outward.id,
          status: 'Fulfilled',
          fulfilledBy: userInfo.username,
          fulfilledAt: new Date(),
        },
      });

      // Record activity log
      await tx.activityLog.create({
        data: {
          moduleType: 'requisition',
          activityType: 'outward_created_from_requisition',
          referenceId: requisitionId.toString(),
          bagNumber: requiredBags,
          grnNumber: inward.grnNumber || null,
          userId: userInfo.userId,
          username: userInfo.username,
          status: 'Success',
          metadata: {
            requisitionId: requisitionId,
            outwardId: outward.id,
            materialName: inward.materialName,
            quantity: requisition.requiredQuantity,
            unit: requisition.unit,
            bagsIssued: requiredBags,
          },
        },
      });

      return outward;
    });
  }

  async findAll() {
    const outwards = await this.prisma.outwardEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return outwards.map((o) => this.mapOutwardPermissions(o));
  }

  async findOne(id: number) {
    const outward = await this.prisma.outwardEntry.findUnique({
      where: { id },
    });

    if (!outward) {
      throw new NotFoundException('Outward entry not found');
    }

    return this.mapOutwardPermissions(outward);
  }

  async scanQr(outwardId: number, qrId: string) {
    console.log('\n========== QR SCAN REQUEST RECEIVED ==========');
    console.log('Scanning QR:', qrId);
    console.log('For Outward ID:', outwardId);
    console.log('Backend Timestamp:', new Date().toISOString());

    try {
    const result = await this.prisma.$transaction(async (tx) => {
      console.log('🔎 Looking up outward entry...');
      const outward = await tx.outwardEntry.findUnique({
        where: { id: outwardId },
      });
      if (!outward) {
        console.log('Outward entry not found for ID:', outwardId);
        throw new NotFoundException('Outward entry not found');
      }
      console.log('Outward found:', {
        id: outward.id,
        materialName: outward.materialName,
      });

      console.log('Looking up QR code...');
      const qr = await tx.inwardQrCode.findUnique({
        where: { qrId },
        include: { inward: true },
      });

      if (!qr) {
        console.log('QR code not found in database:', qrId);
        throw new BadRequestException('Invalid QR code - no such bag exists');
      }
      console.log('QR found:', {
        qrId: qr.qrId,
        state: qr.state,
        inwardId: qr.inwardId,
      });

      console.log('Validating QR state...');
      if (qr.state === QrState.ISSUED) {
        console.log('⚠️  QR already ISSUED');
        throw new BadRequestException(
          'This bag is already scanned for outward dispatch'
        );
      }

      if (qr.state === QrState.CONSUMED) {
        console.log('QR already CONSUMED');
        throw new BadRequestException('This bag is already used in production');
      }

      if (qr.state === QrState.RESERVED && qr.outwardId !== outwardId) {
        throw new BadRequestException(
          'This QR belongs to another outward transaction.'
        );
      }

      console.log('Validating material match...');
      if (qr.inward.materialName !== outward.materialName) {
        console.log('Material mismatch:', {
          qrMaterial: qr.inward.materialName,
          outwardMaterial: outward.materialName,
        });
        throw new BadRequestException(
          `This QR belongs to ${qr.inward.materialName}, but this outward is for ${outward.materialName}`
        );
      }
      console.log('Material match verified:', qr.inward.materialName);

      // A printed bag that is still free can be issued through this outward,
      // so the operator can scan whatever bag is physically in hand.
      if (qr.state === QrState.CREATED) {
        const totalBags = outward.bagsIssued || 0;
        if (totalBags <= 0) {
          throw new BadRequestException(
            'This outward entry has no bags allocated for scanning.'
          );
        }

        const alreadyScanned = await tx.inwardQrCode.count({
          where: { outwardId, state: QrState.ISSUED },
        });
        if (alreadyScanned >= totalBags) {
          throw new BadRequestException(
            'All bags for this outward are already scanned.'
          );
        }

        console.log('Reserving free bag for this outward:', qrId);
        await tx.inwardQrCode.update({
          where: { qrId },
          data: { state: QrState.RESERVED, outwardId },
        });
      }

      console.log('Updating QR state to ISSUED...');
      await tx.inwardQrCode.update({
        where: { qrId },
        data: {
          state: QrState.ISSUED,
          scannedAtOutward: new Date(),
        },
      });
      console.log('QR state updated to ISSUED');

      // If production scan already happened, mark as CONSUMED (both scans complete)
      const qrAfterOutward = await tx.inwardQrCode.findUnique({
        where: { qrId },
        select: { scannedAtProduction: true, state: true },
      });
      if (qrAfterOutward?.scannedAtProduction) {
        await tx.inwardQrCode.update({
          where: { qrId },
          data: { state: QrState.CONSUMED },
        });
      }

      console.log('Counting scanned bags...');
      const scannedBags = await tx.inwardQrCode.count({
        where: { outwardId, state: QrState.ISSUED },
      });
      console.log(`Scan count: ${scannedBags}/${outward.bagsIssued}`);

      const totalBagsToScan = outward.bagsIssued || 0;
      const currentStatus =
        totalBagsToScan > 0 && scannedBags >= totalBagsToScan
          ? 'Completed'
          : 'Pending';
      console.log('Updating outward status to:', currentStatus);
      console.log(
        `Total bags to scan: ${totalBagsToScan}, Scanned so far: ${scannedBags}`
      );

      await tx.outwardEntry.update({
        where: { id: outwardId },
        data: {
          qrScanStatus: {
            scannedBags,
            totalBags: outward.bagsIssued,
            lastScannedQrId: qrId,
            lastScannedAt: new Date(),
          },
          status: currentStatus,
        },
      });

      // Bags reserved at creation that were never scanned are not dispatched,
      // so put them back into circulation once the outward is complete.
      if (currentStatus === 'Completed') {
        await tx.inwardQrCode.updateMany({
          where: { outwardId, state: QrState.RESERVED },
          data: { state: QrState.CREATED, outwardId: null },
        });
      }
      console.log('Outward updated successfully');

      console.log('========== END QR SCAN ==========\n');
      return {
        message: `QR ${qrId} scanned successfully`,
        scannedBags,
        totalBags: outward.bagsIssued,
        status: currentStatus,
      };
    });

    await this.safeLog({
      moduleType: 'outward',
      activityType: 'qr_scan',
      referenceId: outwardId.toString(),
      qrId,
      status: 'Success',
      metadata: {
        outwardId,
        scannedBags: result.scannedBags,
        totalBags: result.totalBags,
        outwardStatus: result.status,
      },
    });

    return result;
    } catch (error) {
      await this.safeLog({
        moduleType: 'outward',
        activityType: 'qr_scan',
        referenceId: outwardId.toString(),
        qrId,
        status: 'Failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getAnalytics() {
    const total = await this.prisma.outwardEntry.count();
    const pending = await this.prisma.outwardEntry.count({
      where: { status: 'Pending' },
    });
    const completed = await this.prisma.outwardEntry.count({
      where: { status: 'Completed' },
    });
    return { total, pending, completed };
  }

  async remove(id: number) {
    const outwardForLog = await this.prisma.outwardEntry.findUnique({
      where: { id },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Find outward entry
      const outward = await tx.outwardEntry.findUnique({
        where: { id },
      });

      if (!outward) {
        throw new NotFoundException('Outward entry not found');
      }

      // 2. Check if dispatch has started
      const scannedBags = (outward.qrScanStatus as any)?.scannedBags ?? 0;

      if (scannedBags > 0) {
        throw new BadRequestException(
          'Cannot delete outward entry after dispatch has started.'
        );
      }

      // 3. Restore stock to the supplier it was deducted from
      let supplierName = outward.supplierName;
      if (!supplierName) {
        const qr = await tx.inwardQrCode.findFirst({
          where: { outwardId: id },
          select: { inward: { select: { supplierName: true } } },
        });
        supplierName = qr?.inward.supplierName ?? null;
      }

      let stock = await tx.materialStock.findFirst({
        where: {
          materialName: {
            equals: outward.materialName,
            mode: 'insensitive',
          },
          ...(supplierName
            ? {
                supplierName: {
                  equals: supplierName,
                  mode: 'insensitive',
                },
              }
            : {}),
        },
      });

      if (!stock) {
        stock = await tx.materialStock.findFirst({
          where: {
            materialName: {
              equals: outward.materialName,
              mode: 'insensitive',
            },
          },
        });
      }

      if (stock) {
        await tx.materialStock.update({
          where: { id: stock.id },
          data: {
            totalQuantity: {
              increment: outward.baseQuantity ?? outward.quantity,
            },
            baseQuantity: { increment: outward.baseQuantity ?? outward.quantity },
            updatedAt: new Date(),
          },
        });
      }

      // 4. Release reserved QR codes
      await tx.inwardQrCode.updateMany({
        where: {
          outwardId: id,
        },
        data: {
          state: QrState.CREATED,
          outwardId: null,
          scannedAtOutward: null,
        },
      });

      // 5. Delete outward entry
      await tx.outwardEntry.delete({
        where: { id },
      });

      return {
        message: 'Outward entry deleted successfully.',
      };
    });

    await this.safeLog({
      moduleType: 'outward',
      activityType: 'entry_deletion',
      referenceId: id.toString(),
      status: 'Success',
      metadata: {
        materialName: outwardForLog?.materialName,
        supplierName: outwardForLog?.supplierName,
        quantity: outwardForLog?.quantity,
        unit: outwardForLog?.unit,
      },
    });

    return result;
  }
}
