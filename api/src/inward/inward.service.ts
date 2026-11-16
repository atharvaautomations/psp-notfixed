import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateInwardDto } from './dto/create-inward.dto';
import { UpdateInwardDto } from './dto/update-inward.dto';
import { QrState, Prisma } from '@prisma/client';
import { normalizeName, canonicalName } from '../common/utils/normalize';
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  normalizeUnit,
  getBaseUnit,
  UnitType,
} from '../utils/unit-conversion';

type PrismaTransactionClient = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class InwardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService
  ) {}

  private computeStatus(expDate: Date) {
    const today = new Date();
    const t = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const e = new Date(
      expDate.getFullYear(),
      expDate.getMonth(),
      expDate.getDate()
    ).getTime();

    return e < t ? 'Expired' : 'Active';
  }

  private mapInwardPermissions<
    T extends { expDate: Date; qrCodes?: { state: QrState }[] }
  >(inward: T) {
    const isExpired = this.computeStatus(inward.expDate) === 'Expired';

    const canDelete =
      !isExpired &&
      (!inward.qrCodes ||
        inward.qrCodes.every((qr) => qr.state === QrState.CREATED));

    return {
      ...inward,
      isExpired,
      canEdit: !isExpired,
      canPrintQr: !isExpired,
      canDelete,
    };
  }

  private buildQrList(inward: {
    id: number;
    materialName: string;
    quantity: number;
    bagWeight: number | null;
    storedAsWhole: boolean;
  }) {
    const list: { bagNo: number; label: string; qrId: string }[] = [];

    if (inward.storedAsWhole) {
      const formattedQrId = `MT-${String(inward.id).padStart(5, '0')}-FULL`;

      list.push({
        bagNo: 1,
        label: `${inward.materialName} - Full Lot`,
        qrId: formattedQrId,
      });

      return list;
    }

    const bagW = inward.bagWeight ?? 1;
    const totalBags = Math.max(1, Math.ceil(inward.quantity / bagW));

    for (let i = 1; i <= totalBags; i++) {
      const formattedQrId = `INW-${String(inward.id).padStart(5, '0')}-${String(
        i
      ).padStart(4, '0')}`;

      list.push({
        bagNo: i,
        label: `${inward.materialName} - Bag ${i}`,
        qrId: formattedQrId,
      });
    }

    return list;
  }

  private async incrementStock(
    materialName: string,
    supplierName: string | null,
    unit: string,
    quantity: number,
    tx: PrismaTransactionClient | Prisma.TransactionClient = this.prisma
  ) {
    const baseQty = convertToBaseUnit(quantity, normalizeUnit(unit) as UnitType);
    const baseUnit = getBaseUnit(normalizeUnit(unit) as UnitType);

    const existing = await tx.materialStock.findFirst({
      where: {
        materialName: {
          equals: materialName,
          mode: 'insensitive',
        },
        supplierName: supplierName
          ? { equals: supplierName, mode: 'insensitive' }
          : { equals: null },
      },
    });

    if (existing) {
      await tx.materialStock.update({
        where: { id: existing.id },
        data: {
          totalQuantity: { increment: baseQty },
          unit: baseUnit,
          baseQuantity: { increment: baseQty },
          baseUnit,
          updatedAt: new Date(),
        },
      });
      return;
    }

    await tx.materialStock.create({
      data: {
        materialName,
        supplierName,
        totalQuantity: baseQty,
        unit: baseUnit,
        baseQuantity: baseQty,
        baseUnit,
      },
    });
  }

  private async decrementStock(
    materialName: string,
    supplierName: string | null,
    quantity: number,
    tx: PrismaTransactionClient | Prisma.TransactionClient = this.prisma
  ) {
    const stock = await tx.materialStock.findFirst({
      where: {
        materialName: {
          equals: materialName,
          mode: 'insensitive',
        },
        supplierName: supplierName
          ? { equals: supplierName, mode: 'insensitive' }
          : { equals: null },
      },
    });
    if (!stock) return;

    await tx.materialStock.update({
      where: { id: stock.id },
      data: { totalQuantity: { decrement: quantity }, updatedAt: new Date() },
    });
  }

  private async adjustStockOnEdit(
    oldMaterial: string,
    oldSupplier: string | null,
    newMaterial: string,
    newSupplier: string | null,
    oldQty: number,
    newQty: number,
    unit: string,
    tx: PrismaTransactionClient | Prisma.TransactionClient
  ) {
    const oldKey = normalizeName(oldMaterial);
    const newKey = normalizeName(newMaterial);

    const oldCanonical = canonicalName(oldKey);
    const newCanonical = canonicalName(newKey);

    if (oldKey === newKey && oldSupplier === newSupplier) {
      const diff = newQty - oldQty;
      if (diff !== 0) {
        // ensure record exists (case-insensitive)
        const s = await tx.materialStock.findFirst({
          where: {
            materialName: {
              equals: oldCanonical,
              mode: 'insensitive',
            },
            supplierName: oldSupplier
              ? { equals: oldSupplier, mode: 'insensitive' }
              : { equals: null },
          },
        });

        if (s) {
          await tx.materialStock.update({
            where: { id: s.id },
            data: { totalQuantity: { increment: diff }, updatedAt: new Date() },
          });
        } else {
          await tx.materialStock.create({
            data: {
              materialName: oldCanonical,
              supplierName: oldSupplier,
              totalQuantity: diff > 0 ? diff : 0,
              unit,
            },
          });
        }
      }
    } else {
      // decrement old (case-insensitive)
      const oldStock = await tx.materialStock.findFirst({
        where: {
          materialName: {
            equals: oldCanonical,
            mode: 'insensitive',
          },
          supplierName: oldSupplier
            ? { equals: oldSupplier, mode: 'insensitive' }
            : { equals: null },
        },
      });

      if (oldStock) {
        await tx.materialStock.update({
          where: { id: oldStock.id },
          data: { totalQuantity: { decrement: oldQty }, updatedAt: new Date() },
        });
      }

      // increment/create new (canonical)
      await this.incrementStock(newCanonical, newSupplier, unit, newQty, tx);
    }
  }

  async create(
    dto: CreateInwardDto,
    userInfo?: { userId: number; username: string }
  ) {
    // ✅ FIX: canonicalize material + supplier (trim + collapse spaces + case normalization)
    const materialName = canonicalName(normalizeName(dto.materialName));
    const supplierName = canonicalName(normalizeName(dto.supplierName));

    const expDate = new Date(dto.expDate);
    const storedAsWhole = dto.storedAsWhole ?? false;
    const bagWeight = storedAsWhole ? null : dto.bagWeight ?? null;

    // ✅ Safety: if not storedAsWhole then bagWeight must be > 0 (service-level guard)
    if (!storedAsWhole) {
      if (
        bagWeight === null ||
        typeof bagWeight !== 'number' ||
        bagWeight <= 0
      ) {
        throw new BadRequestException(
          'bagWeight is required and must be > 0 when storedAsWhole is false'
        );
      }
    }

    // ✅ Safety: expDate must be after mfgDate
    const mfgDate = new Date(dto.mfgDate);
    if (expDate.getTime() <= mfgDate.getTime()) {
      throw new BadRequestException('Expiry must be after manufacturing date');
    }

    // Normalize unit
    const normalizedUnit = normalizeUnit(dto.unit) as UnitType;

    // ✅ NOS unit: quantity must be a whole number
    if (normalizedUnit === 'NOS' && !Number.isInteger(dto.quantity)) {
      throw new BadRequestException(
        'Quantity must be a whole number for NOS unit.'
      );
    }

    // Convert quantity and bagWeight to base units
    const baseQuantity = convertToBaseUnit(dto.quantity, normalizedUnit);
    const baseUnit = getBaseUnit(normalizedUnit);
    const baseBagWeight = bagWeight
      ? convertToBaseUnit(bagWeight, normalizedUnit)
      : null;

    const newInward = await this.prisma.$transaction(async (tx) => {
      // 1. Create Inward Entry
      const inward = await tx.inwardEntry.create({
        data: {
          materialName,
          materialNumber: dto.materialNumber?.trim() || null,
          supplierName,
          batchNumber: dto.batchNumber?.trim() || null,
          batchDate: dto.batchDate ? new Date(dto.batchDate) : null,
          grnNumber: dto.grnNumber?.trim() || null,
          grnDate: dto.grnDate ? new Date(dto.grnDate) : null,
          shelfLife: dto.shelfLife?.trim() || null,
          qcDate: dto.qcDate ? new Date(dto.qcDate) : null,
          supplierInvoiceNumber: dto.supplierInvoiceNumber?.trim() || null,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
          quantity: dto.quantity,
          unit: normalizedUnit,
          baseQuantity,
          baseUnit,
          bagWeight: bagWeight,
          bagWeightBase: baseBagWeight,
          storedAsWhole: storedAsWhole,
          mfgDate: mfgDate,
          expDate: expDate,
          status: this.computeStatus(expDate),
        },
      });

      // 2. Update Stock (case-insensitive safe) - use base quantity
      await this.incrementStock(
        materialName,
        supplierName,
        baseUnit,
        baseQuantity,
        tx
      );

      // 3. Create QR Codes
      const qrList = this.buildQrList({
        ...inward,
        quantity: dto.quantity,
        bagWeight: bagWeight,
      });
      if (qrList.length) {
        await tx.inwardQrCode.createMany({
          data: qrList.map((qr) => ({
            ...qr,
            inwardId: inward.id,
            state: QrState.CREATED,
            printed: false,
          })),
        });
      }

      return inward;
    });

    // Record activity log
    await this.activityLog.log({
      moduleType: 'inward',
      activityType: 'entry_creation',
      referenceId: newInward.id.toString(),
      grnNumber: newInward.grnNumber || undefined,
      userId: userInfo?.userId ?? undefined,
      username: userInfo?.username ?? undefined,
      status: 'Success',
      metadata: {
        materialName: newInward.materialName,
        supplierName: newInward.supplierName,
        quantity: dto.quantity,
        unit: normalizedUnit,
        baseQuantity,
        baseUnit,
      },
    });

    return this.findOne(newInward.id);
  }

  async update(id: number, dto: UpdateInwardDto) {
    const existing = await this.prisma.inwardEntry.findUnique({
      where: { id },
      include: { qrCodes: true },
    });
    if (!existing) throw new NotFoundException('Inward entry not found');

    const mfg = dto.mfgDate ? new Date(dto.mfgDate) : existing.mfgDate;
    const exp = dto.expDate ? new Date(dto.expDate) : existing.expDate;

    if (exp.getTime() <= mfg.getTime()) {
      throw new BadRequestException('Expiry must be after manufacturing date');
    }

    const status = this.computeStatus(exp);

    const newStoredAsWhole = dto.storedAsWhole ?? existing.storedAsWhole;

    const newBagWeight =
      newStoredAsWhole === true ? null : dto.bagWeight ?? existing.bagWeight;

    if (!newStoredAsWhole) {
      if (
        newBagWeight === null ||
        typeof newBagWeight !== 'number' ||
        newBagWeight <= 0
      ) {
        throw new BadRequestException(
          'bagWeight is required and must be > 0 when storedAsWhole is false'
        );
      }
    }

    const bagLogicChanged =
      (dto.quantity !== undefined && dto.quantity !== existing.quantity) ||
      (dto.bagWeight !== undefined && dto.bagWeight !== existing.bagWeight) ||
      (dto.storedAsWhole !== undefined &&
        dto.storedAsWhole !== existing.storedAsWhole);

    // ✅ FIX: normalize/canonicalize names if provided
    const nextMaterialName = dto.materialName
      ? canonicalName(normalizeName(dto.materialName))
      : existing.materialName;

    const nextSupplierName = dto.supplierName
      ? canonicalName(normalizeName(dto.supplierName))
      : existing.supplierName;

    // ✅ CRITICAL: prevent QR regeneration if any QR already moved beyond CREATED
    const hasNonCreatedQr = existing.qrCodes.some(
      (qr) => qr.state !== QrState.CREATED
    );
    if (bagLogicChanged && hasNonCreatedQr) {
      throw new BadRequestException(
        'Cannot change bag structure after QR has been issued or consumed'
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update Inward Entry
      const updatedEntry = await tx.inwardEntry.update({
        where: { id },
        data: {
          materialName: nextMaterialName,
          supplierName: nextSupplierName,
          batchNumber:
            dto.batchNumber !== undefined
              ? dto.batchNumber.trim() || null
              : existing.batchNumber,
          batchDate: dto.batchDate !== undefined
            ? new Date(dto.batchDate)
            : existing.batchDate,
          materialNumber: dto.materialNumber !== undefined
            ? dto.materialNumber.trim() || null
            : existing.materialNumber,
          grnNumber: dto.grnNumber !== undefined
            ? dto.grnNumber.trim() || null
            : existing.grnNumber,
          grnDate: dto.grnDate !== undefined
            ? new Date(dto.grnDate)
            : existing.grnDate,
          shelfLife: dto.shelfLife !== undefined
            ? dto.shelfLife.trim() || null
            : existing.shelfLife,
          qcDate: dto.qcDate !== undefined
            ? new Date(dto.qcDate)
            : existing.qcDate,
          supplierInvoiceNumber: dto.supplierInvoiceNumber !== undefined
            ? dto.supplierInvoiceNumber.trim() || null
            : existing.supplierInvoiceNumber,
          invoiceDate: dto.invoiceDate !== undefined
            ? new Date(dto.invoiceDate)
            : existing.invoiceDate,
          quantity: dto.quantity ?? existing.quantity,
          unit: dto.unit ? normalizeUnit(dto.unit) : existing.unit,
          baseQuantity: dto.quantity !== undefined
            ? convertToBaseUnit(dto.quantity, normalizeUnit(dto.unit))
            : existing.baseQuantity,
          baseUnit: dto.unit !== undefined
            ? getBaseUnit(normalizeUnit(dto.unit))
            : existing.baseUnit,
          bagWeight: newBagWeight,
          bagWeightBase: dto.bagWeight !== undefined && !newStoredAsWhole
            ? convertToBaseUnit(dto.bagWeight, normalizeUnit(dto.unit ?? existing.unit))
            : existing.bagWeightBase,
          storedAsWhole: newStoredAsWhole,
          mfgDate: mfg,
          expDate: exp,
          status,
        },
      });

      // 2. Adjust Stock (now normalization-safe)
      await this.adjustStockOnEdit(
        existing.materialName,
        existing.supplierName,
        nextMaterialName,
        nextSupplierName,
        existing.quantity,
        dto.quantity ?? existing.quantity,
        dto.unit ?? existing.unit,
        tx
      );

      // 3. Re-generate QR codes only if safe and needed
      if (bagLogicChanged) {
        await tx.inwardQrCode.deleteMany({ where: { inwardId: id } });
        const qrList = this.buildQrList(updatedEntry);
        if (qrList.length) {
          await tx.inwardQrCode.createMany({
            data: qrList.map((qr) => ({
              ...qr,
              inwardId: id,
              state: QrState.CREATED,
              printed: false,
            })),
          });
        }
      }

      return updatedEntry;
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const existing = await this.prisma.inwardEntry.findUnique({
      where: { id },
      include: {
        qrCodes: {
          select: {
            state: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Inward entry not found');
    }

    // Prevent deletion if any QR has been issued/consumed
    const hasUsedQr = existing.qrCodes.some(
      (qr) => qr.state !== QrState.CREATED
    );

    if (hasUsedQr) {
      throw new BadRequestException(
        'This material has already been issued and cannot be deleted.'
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inwardQrCode.deleteMany({
        where: { inwardId: id },
      });

      await tx.inwardEntry.delete({
        where: { id },
      });

      await this.decrementStock(
        existing.materialName,
        existing.supplierName,
        existing.quantity,
        tx
      );
    });

    return {
      message: 'Inward entry deleted successfully.',
    };
  }

  async findAll() {
    const inwardEntries = await this.prisma.inwardEntry.findMany({
      include: { qrCodes: true },
      orderBy: { createdAt: 'desc' },
    });

    return inwardEntries.map((entry) => this.mapInwardPermissions(entry));
  }

  async findOne(id: number) {
    const inward = await this.prisma.inwardEntry.findUnique({
      where: { id },
      include: { qrCodes: true },
    });
    if (!inward) throw new NotFoundException('Inward entry not found');
    return this.mapInwardPermissions(inward);
  }

  async getQrCodesByInward(inwardId: number) {
    const inward = await this.prisma.inwardEntry.findUnique({
      where: { id: inwardId },
      include: { qrCodes: true },
    });
    if (!inward)
      throw new NotFoundException(`Inward entry ${inwardId} not found`);

    return inward.qrCodes.map((qr) => ({
      bagNo: qr.bagNo,
      label: qr.label,
      qrId: qr.qrId,
      printed: qr.printed,
      // Print preview disables consumed labels; without this the UI cannot
      // distinguish them even though printBatch already rejects them.
      state: qr.state,
    }));
  }

  async getStock() {
    const inwardEntries = await this.prisma.inwardEntry.findMany({
      select: {
        id: true,
        materialName: true,
        supplierName: true,
        quantity: true,
        unit: true,
        bagWeight: true,
        storedAsWhole: true,
        status: true,
        qrCodes: {
          where: { state: QrState.CREATED },
          select: { qrId: true },
        },
      },
      orderBy: [
        { materialName: 'asc' },
        { bagWeight: 'desc' },
        { supplierName: 'asc' },
      ],
    });

    // Transform into stock view grouped by material + supplier + bag size combo
    return inwardEntries
      .filter((e) => e.status === 'Active') // Only active materials
      .map((inward) => ({
        id: inward.id,
        materialName: inward.materialName,
        supplierName: inward.supplierName,
        bagWeight: inward.bagWeight,
        unit: inward.unit,
        storedAsWhole: inward.storedAsWhole,
        totalQuantity: inward.quantity,
        totalBags: inward.qrCodes.length,
        availableBags: inward.qrCodes.length,
        displayName: inward.storedAsWhole
          ? `${inward.materialName} - Full Lot (${inward.supplierName})`
          : `${inward.materialName} - ${inward.bagWeight}${inward.unit}/bag (${inward.supplierName})`,
      }));
  }

  async getAnalytics() {
    const all = await this.prisma.inwardEntry.findMany();

    const totalMaterials = all.length;
    const active = all.filter((r) => r.status === 'Active').length;
    const expired = all.filter((r) => r.status === 'Expired').length;

    const supplierMap = new Map<string, number>();
    for (const r of all) {
      const current = supplierMap.get(r.supplierName) ?? 0;
      supplierMap.set(r.supplierName, current + r.quantity);
    }

    const topSuppliers = Array.from(supplierMap.entries())
      .map(([supplier, qty]) => ({ supplier, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { totalMaterials, active, expired, topSuppliers };
  }

  async findAllFiltered(
    search?: string,
    status?: string,
    sort: 'asc' | 'desc' = 'desc',
    unit?: string
  ) {
    const inwardEntries = await this.prisma.inwardEntry.findMany({
      where: {
        AND: [
          search
            ? {
                materialName: {
                  contains: search,
                  mode: 'insensitive',
                },
              }
            : {},
          status && status !== 'All' ? { status } : {},
          unit ? { unit } : {},
        ],
      },
      include: {
        qrCodes: true,
      },
      orderBy: {
        createdAt: sort,
      },
    });

    return inwardEntries.map((entry) => this.mapInwardPermissions(entry));
  }

  async getMaterials() {
    const rows = await this.prisma.inwardEntry.findMany({
      distinct: ['materialName'],
      select: { materialName: true },
      orderBy: { materialName: 'asc' },
    });
    return rows.map((r) => r.materialName);
  }

  async getSuppliers() {
    const rows = await this.prisma.inwardEntry.findMany({
      distinct: ['supplierName'],
      select: { supplierName: true },
      orderBy: { supplierName: 'asc' },
    });
    return rows.map((r) => r.supplierName);
  }

  async getAvailableBags(material: string) {
    const materialName = canonicalName(normalizeName(material));

    return this.prisma.inwardQrCode.findMany({
      where: {
        inward: {
          materialName: {
            equals: materialName,
            mode: 'insensitive',
          },
        },
        state: QrState.CREATED,
      },
      select: {
        qrId: true,
        bagNo: true,
        inward: {
          select: {
            bagWeight: true,
            unit: true,
          },
        },
      },
      orderBy: { bagNo: 'asc' },
    });
  }

  async getAvailableBagsByInward(inwardId: number) {
    return this.prisma.inwardQrCode.findMany({
      where: {
        inwardId,
        state: QrState.CREATED,
      },
      select: {
        qrId: true,
        bagNo: true,
        inward: {
          select: {
            bagWeight: true,
            unit: true,
          },
        },
      },
      orderBy: { bagNo: 'asc' },
    });
  }

  async getAvailableForOutward() {
    return this.prisma.inwardEntry.findMany({
      where: {
        status: 'Active',
        qrCodes: {
          some: {
            state: QrState.CREATED,
          },
        },
      },
      select: {
        id: true,
        materialName: true,
        supplierName: true,
        quantity: true,
        unit: true,
        bagWeight: true,
        storedAsWhole: true,
        _count: {
          select: {
            qrCodes: {
              where: { state: QrState.CREATED },
            },
          },
        },
      },
      orderBy: [
        { materialName: 'asc' },
        { bagWeight: 'desc' },
        { supplierName: 'asc' },
      ],
    });
  }

  async getAvailableBagsByInwardId(inwardId: number) {
    return this.prisma.inwardQrCode.findMany({
      where: {
        inwardId,
        state: QrState.CREATED,
      },
      select: {
        qrId: true,
        bagNo: true,
        inward: {
          select: {
            bagWeight: true,
            unit: true,
          },
        },
      },
      orderBy: { bagNo: 'asc' },
    });
  }

  async getQrByQrId(qrId: string) {
    console.log('\n========== 📱 SERVICE: getQrByQrId ==========');
    console.log('🔍 Looking up QR ID:', qrId);

    const qr = await this.prisma.inwardQrCode.findUnique({
      where: { qrId },
      include: {
        inward: {
          select: {
            id: true,
            materialName: true,
            supplierName: true,
            batchNumber: true,
            bagWeight: true,
            unit: true,
            quantity: true,
            mfgDate: true,
            expDate: true,
            status: true,
          },
        },
      },
    });

    if (!qr) {
      console.error('❌ QR not found in database:', qrId);
      throw new NotFoundException(`QR code '${qrId}' not found`);
    }

    console.log('✅ QR found:', {
      qrId: qr.qrId,
      state: qr.state,
      inwardId: qr.inwardId,
      material: qr.inward.materialName,
      supplier: qr.inward.supplierName,
      bagWeight: qr.inward.bagWeight,
    });

    // Return QR details with state and status information
    const result = {
      qrId: qr.qrId,
      bagNo: qr.bagNo,
      label: qr.label,
      state: qr.state,
      printed: qr.printed,
      inwardId: qr.inwardId,
      outwardId: qr.outwardId,
      scannedAtOutward: qr.scannedAtOutward,
      scannedAtProduction: qr.scannedAtProduction,
      consumedAt: qr.consumedAt,
      inward: qr.inward,
      createdAt: qr.createdAt,
    };

    console.log('✅ Returning QR data');
    console.log('========== END getQrByQrId ==========\n');
    return result;
  }
}
