import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { normalizeName, canonicalName } from '../common/utils/normalize';
import {
  convertToBaseUnit,
  normalizeUnit,
  getBaseUnit,
  UnitType,
} from '../utils/unit-conversion';
import { OutwardService } from '../outward/outward.service';

@Injectable()
export class RequisitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly outwardService: OutwardService,
  ) {}

  private generateRequisitionNumber(): string {
    const date = new Date();
    const yyyy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const hh = date.getHours().toString().padStart(2, '0');
    const mi = date.getMinutes().toString().padStart(2, '0');
    return `REQ-${yyyy}${mm}${dd}-${hh}${mi}`;
  }

  async create(dto: CreateRequisitionDto, userInfo: { userId: number; username: string }) {
    const requisitionNumber = this.generateRequisitionNumber();

    try {
      // Normalize unit
      const normalizedUnit = normalizeUnit(dto.unit) as UnitType;

      // Calculate requiredQuantity from bags × weightPerBag if bags provided
      let requiredQuantity = dto.requiredQuantity;
      let baseQuantity: number;
      let baseUnit: UnitType;

      if (dto.numberOfBags && dto.weightPerBag) {
        // Auto-calculate: bags × weightPerBag
        requiredQuantity = dto.numberOfBags * dto.weightPerBag;
        baseQuantity = convertToBaseUnit(requiredQuantity, normalizedUnit);
        baseUnit = getBaseUnit(normalizedUnit);
      } else {
        baseQuantity = convertToBaseUnit(requiredQuantity, normalizedUnit);
        baseUnit = getBaseUnit(normalizedUnit);
      }

      const requisition = await (this.prisma.requisition as any).create({
        data: {
          requisitionNumber,
          materialName: dto.materialName,
          materialNumber: dto.materialNumber || null,
          supplierName: dto.supplierName,
          batchNumber: dto.batchNumber || null,
          requiredQuantity,
          unit: normalizedUnit,
          baseQuantity,
          baseUnit,
          numberOfBags: dto.numberOfBags || null,
          weightPerBag: dto.weightPerBag || null,
          sourceInwardId: dto.sourceInwardId || null,
          requestedBy: userInfo.username,
          status: 'Pending',
          notes: dto.notes || null,
        },
      });

      // Record activity log
      await this.activityLog.log({
        moduleType: 'requisition',
        activityType: 'entry_creation',
        referenceId: requisition.id.toString(),
        userId: userInfo.userId as any,
        username: userInfo.username,
        status: 'Success',
        metadata: {
          materialName: requisition.materialName,
          supplierName: requisition.supplierName,
          requiredQuantity,
          unit: normalizedUnit,
          numberOfBags: dto.numberOfBags,
          weightPerBag: dto.weightPerBag,
          sourceInwardId: dto.sourceInwardId,
        },
      });

      return requisition;
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to create requisition');
    }
  }

  async findAll(filters?: { search?: string; status?: string; sort?: 'asc' | 'desc' }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { materialName: { contains: filters.search, mode: 'insensitive' } },
        { requisitionNumber: { contains: filters.search, mode: 'insensitive' } },
        { supplierName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.status && filters.status !== 'All') {
      where.status = filters.status;
    }

    return (this.prisma.requisition as any).findMany({
      where,
      orderBy: filters?.sort === 'asc' ? { createdAt: 'asc' } : { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const requisition = await (this.prisma.requisition as any).findUnique({
      where: { id },
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    return requisition;
  }

  async update(id: number, dto: UpdateRequisitionDto, userInfo: { userId: number; username: string }) {
    const existing = await this.prisma.requisition.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Requisition not found');
    }

    const updateData: any = {};

    if (dto.materialName !== undefined) {
      updateData.materialName = canonicalName(normalizeName(dto.materialName));
    }
    if (dto.materialNumber !== undefined) {
      updateData.materialNumber = dto.materialNumber?.trim() || null;
    }
    if (dto.supplierName !== undefined) {
      updateData.supplierName = canonicalName(normalizeName(dto.supplierName));
    }
    if (dto.batchNumber !== undefined) {
      updateData.batchNumber = dto.batchNumber?.trim() || null;
    }
    if (dto.requiredQuantity !== undefined) {
      const u = dto.unit ? normalizeUnit(dto.unit) : (existing.unit as UnitType);
      updateData.requiredQuantity = dto.requiredQuantity;
      updateData.unit = u;
      updateData.baseQuantity = convertToBaseUnit(dto.requiredQuantity, u);
      updateData.baseUnit = getBaseUnit(u);
    }
    if (dto.unit !== undefined) {
      const u = normalizeUnit(dto.unit);
      updateData.unit = u;
      updateData.baseQuantity = convertToBaseUnit(dto.requiredQuantity ?? existing.requiredQuantity, u);
      updateData.baseUnit = getBaseUnit(u);
    }
    if (dto.numberOfBags !== undefined) {
      updateData.numberOfBags = dto.numberOfBags;
    }
    if (dto.weightPerBag !== undefined) {
      updateData.weightPerBag = dto.weightPerBag;
    }
    if (dto.sourceInwardId !== undefined) {
      updateData.sourceInwardId = dto.sourceInwardId;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes?.trim() || null;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    const updated = await (this.prisma.requisition as any).update({
      where: { id },
      data: updateData,
    });

    await this.activityLog.log({
      moduleType: 'requisition',
      activityType: 'entry_update',
      referenceId: id.toString(),
      userId: userInfo.userId as any,
      username: userInfo.username,
      status: 'Success',
      metadata: { requisitionId: id, updatedFields: Object.keys(dto) },
    });

    return updated;
  }

  async remove(id: number, userInfo: { userId: number; username: string }) {
    const existing = await this.prisma.requisition.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Requisition not found');
    }

    // Cannot delete if linked to an outward
    if (existing.linkedOutwardId) {
      throw new BadRequestException('Cannot delete a requisition that has an outward linked to it');
    }

    await (this.prisma.requisition as any).delete({
      where: { id },
    });

    await this.activityLog.log({
      moduleType: 'requisition',
      activityType: 'entry_deletion',
      referenceId: id.toString(),
      userId: userInfo.userId as any,
      username: userInfo.username,
      status: 'Success',
      metadata: { requisitionId: id, materialName: existing.materialName },
    });

    return { message: 'Requisition deleted successfully' };
  }

  async approve(id: number, userInfo: { userId: number; username: string }) {
    const existing = await (this.prisma.requisition as any).findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Requisition not found');
    }

    if (existing.status !== 'Pending') {
      throw new BadRequestException('Only pending requisitions can be approved');
    }

    const updated = await (this.prisma.requisition as any).update({
      where: { id },
      data: {
        status: 'Approved',
        approvedBy: userInfo.username,
        approvedAt: new Date(),
      },
    });

    await this.activityLog.log({
      moduleType: 'requisition',
      activityType: 'entry_approval',
      referenceId: id.toString(),
      userId: userInfo.userId as any,
      username: userInfo.username,
      status: 'Success',
      metadata: { requisitionId: id, approvedBy: userInfo.username },
    });

    // Automatically create outward from approved requisition
    const outward = await this.outwardService.createFromRequisition(id, userInfo);

    return {
      ...updated,
      outward,
      message: 'Requisition approved and outward created successfully',
    };
  }

  async reject(id: number, userInfo: { userId: number; username: string }, reason?: string) {
    const existing = await (this.prisma.requisition as any).findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Requisition not found');
    }

    if (existing.status !== 'Pending') {
      throw new BadRequestException('Only pending requisitions can be rejected');
    }

    const updated = await (this.prisma.requisition as any).update({
      where: { id },
      data: {
        status: 'Rejected',
        rejectedBy: userInfo.username,
        rejectedAt: new Date(),
        rejectionReason: reason || null,
      },
    });

    await this.activityLog.log({
      moduleType: 'requisition',
      activityType: 'entry_rejection',
      referenceId: id.toString(),
      userId: userInfo.userId as any,
      username: userInfo.username,
      status: 'Success',
      metadata: { requisitionId: id, rejectedBy: userInfo.username, reason },
    });

    return updated;
  }

  async fulfill(id: number, userInfo: { userId: number; username: string }) {
    const existing = await (this.prisma.requisition as any).findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Requisition not found');
    }

    if (existing.status !== 'Approved') {
      throw new BadRequestException('Only approved requisitions can be fulfilled');
    }

    const updated = await (this.prisma.requisition as any).update({
      where: { id },
      data: {
        status: 'Fulfilled',
        fulfilledBy: userInfo.username,
        fulfilledAt: new Date(),
      },
    });

    await this.activityLog.log({
      moduleType: 'requisition',
      activityType: 'entry_fulfillment',
      referenceId: id.toString(),
      userId: userInfo.userId as any,
      username: userInfo.username,
      status: 'Success',
      metadata: { requisitionId: id, fulfilledBy: userInfo.username },
    });

    return updated;
  }

  async linkOutward(id: number, outwardId: number, userInfo: { userId: number; username: string }) {
    const existing = await (this.prisma.requisition as any).findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Requisition not found');
    }

    if (existing.linkedOutwardId) {
      throw new BadRequestException('Requisition already linked to an outward');
    }

    const updated = await (this.prisma.requisition as any).update({
      where: { id },
      data: {
        linkedOutwardId: outwardId,
        status: 'Fulfilled',
        fulfilledBy: userInfo.username,
        fulfilledAt: new Date(),
      },
    });

    await this.activityLog.log({
      moduleType: 'requisition',
      activityType: 'entry_fulfilled_via_outward',
      referenceId: id.toString(),
      userId: userInfo.userId as any,
      username: userInfo.username,
      status: 'Success',
      metadata: { requisitionId: id, linkedOutwardId: outwardId },
    });

    return updated;
  }
}
