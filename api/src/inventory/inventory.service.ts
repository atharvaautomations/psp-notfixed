import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeUnit } from '../utils/unit-conversion';

export type DisplayUnit = 'KG' | 'LITRE' | 'NOS';

export type UnitSummary = {
  inward: number;
  outward: number;
  currentStock: number;
};

const DISPLAY_UNITS: DisplayUnit[] = ['KG', 'LITRE', 'NOS'];

const UNIT_ORDER: Record<DisplayUnit, number> = {
  KG: 0,
  LITRE: 1,
  NOS: 2,
};

function round(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function emptyUnitRecord<T>(factory: () => T): Record<DisplayUnit, T> {
  return {
    KG: factory(),
    LITRE: factory(),
    NOS: factory(),
  };
}

/**
 * Map any stored unit (display or base) to the dashboard display unit.
 * GRAM -> KG, ML -> LITRE, NOS -> NOS.
 */
function toDisplayUnit(unit?: string | null): DisplayUnit {
  const normalized = normalizeUnit(unit);
  if (normalized === 'GRAM' || normalized === 'KG') return 'KG';
  if (normalized === 'ML' || normalized === 'LITRE') return 'LITRE';
  return 'NOS';
}

/**
 * Convert a stored quantity to dashboard display units.
 * Values stored in grams/millilitres are divided by 1000; display units
 * (KG, LITRE, NOS) and legacy un-migrated values are returned unchanged.
 */
function toDisplayQuantity(
  quantity: number,
  unit?: string | null,
  decimals = 3
): number {
  const value = Number(quantity);
  if (!Number.isFinite(value)) return 0;

  const normalized = normalizeUnit(unit);
  if (normalized === 'GRAM' || normalized === 'ML') {
    return round(value / 1000, decimals);
  }
  return round(value, decimals);
}

function parseUnitFilter(unit?: string | null): DisplayUnit | null {
  if (!unit) return null;

  const raw = unit.trim().toUpperCase();
  if (!raw || raw === 'ALL' || raw === 'ALL UNITS' || raw === 'ALL_UNITS') {
    return null;
  }
  if (raw === 'KG' || raw === 'KGS' || raw === 'GRAM') return 'KG';
  if (
    raw === 'LTR' ||
    raw === 'LITRE' ||
    raw === 'LITRES' ||
    raw === 'L' ||
    raw === 'ML'
  ) {
    return 'LITRE';
  }
  if (raw === 'NOS' || raw === 'PCS' || raw === 'PIECES') return 'NOS';

  return toDisplayUnit(unit);
}

type StockLike = {
  materialName: string;
  totalQuantity: number;
  baseQuantity?: number | null;
  unit?: string | null;
  baseUnit?: string | null;
};

/**
 * MaterialStock stores quantities in base units (GRAM / ML / NOS).
 * baseQuantity is the canonical value when present; totalQuantity is
 * mapped through the same conversion so legacy rows stay readable.
 */
function resolveStockQuantity(stock: StockLike): {
  quantity: number;
  unit: DisplayUnit;
} {
  const baseUnit = normalizeUnit(stock.baseUnit ?? stock.unit);
  const rawQuantity = Number(stock.baseQuantity ?? stock.totalQuantity) || 0;

  return {
    quantity: toDisplayQuantity(rawQuantity, baseUnit),
    unit: toDisplayUnit(baseUnit),
  };
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------
  // DASHBOARD SUMMARY - unit-aware
  // --------------------------------------------------
  async getSummary(unitFilter?: string) {
    const filter = parseUnitFilter(unitFilter);

    const unitWhere = filter
      ? {
          unit: {
            in: filter === 'KG' ? ['KG', 'GRAM'] : filter === 'LITRE' ? ['LITRE', 'ML'] : [filter],
          },
        }
      : {};

    const [inwards, outwards, stocks, expiryRows] = await Promise.all([
      this.prisma.inwardEntry.findMany({
        select: { quantity: true, unit: true },
        where: unitWhere,
      }),
      this.prisma.outwardEntry.findMany({
        select: { quantity: true, unit: true },
        where: unitWhere,
      }),
      this.prisma.materialStock.findMany({
        select: {
          materialName: true,
          totalQuantity: true,
          baseQuantity: true,
          unit: true,
          baseUnit: true,
        },
      }),
      this.prisma.inwardEntry.findMany({
        select: { materialName: true, expDate: true },
        where: unitWhere,
      }),
    ]);

    const byUnit = emptyUnitRecord<UnitSummary>(() => ({
      inward: 0,
      outward: 0,
      currentStock: 0,
    }));

    // Flat totals are kept for the main dashboard which expects single
    // numbers. The inventory dashboard uses the unit-separated values.
    let totalInward = 0;
    let totalOutward = 0;
    let currentStock = 0;

    for (const inward of inwards) {
      const quantity = Number(inward.quantity) || 0;
      totalInward += quantity;

      const unit = toDisplayUnit(inward.unit);
      byUnit[unit].inward += toDisplayQuantity(quantity, inward.unit, 6);
    }

    for (const outward of outwards) {
      const quantity = Number(outward.quantity) || 0;
      totalOutward += quantity;

      const unit = toDisplayUnit(outward.unit);
      byUnit[unit].outward += toDisplayQuantity(quantity, outward.unit, 6);
    }

    for (const stock of stocks) {
      const resolved = resolveStockQuantity(stock);
      if (filter && resolved.unit !== filter) continue;
    }

    // Current stock = inward - outward (not MaterialStock.totalQuantity,
    // which may not be kept in sync with outward transactions).
    currentStock = totalInward - totalOutward;

    for (const unit of DISPLAY_UNITS) {
      byUnit[unit].inward = round(byUnit[unit].inward);
      byUnit[unit].outward = round(byUnit[unit].outward);
      byUnit[unit].currentStock = round(byUnit[unit].inward - byUnit[unit].outward);
    }

    // ----- Material availability / expiry -----
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalMaterialNames = new Set<string>();
    const expiryState = new Map<
      string,
      { hasActive: boolean; hasExpired: boolean }
    >();

    for (const row of expiryRows) {
      const key = row.materialName.trim().toLowerCase();
      totalMaterialNames.add(key);

      const state = expiryState.get(key) ?? {
        hasActive: false,
        hasExpired: false,
      };

      if (!row.expDate || new Date(row.expDate) >= today) {
        state.hasActive = true;
      } else {
        state.hasExpired = true;
      }

      expiryState.set(key, state);
    }

    // Fully expired = every batch is past its expiry date.
    const fullyExpiredNames = new Set<string>();
    for (const [key, state] of expiryState) {
      if (state.hasExpired && !state.hasActive) fullyExpiredNames.add(key);
    }

    const availableNames = new Set<string>();
    for (const stock of stocks) {
      const resolved = resolveStockQuantity(stock);
      if (filter && resolved.unit !== filter) continue;
      if (resolved.quantity <= 0) continue;

      const key = stock.materialName.trim().toLowerCase();
      // A material whose only batches are expired has no usable stock.
      if (fullyExpiredNames.has(key)) continue;

      availableNames.add(key);
    }

    return {
      totalInward: round(totalInward),
      totalOutward: round(totalOutward),
      currentStock: round(currentStock),
      totalMaterials: totalMaterialNames.size,
      materialsInStock: availableNames.size,
      materialsExpired: fullyExpiredNames.size,
      byUnit,
    };
  }

  // --------------------------------------------------
  // MATERIAL INVENTORY STATUS - one row per material/supplier/unit
  // --------------------------------------------------
  async getMaterials(unitFilter?: string) {
    const filter = parseUnitFilter(unitFilter);

    const [inwards, outwards, stocks] = await Promise.all([
      this.prisma.inwardEntry.findMany({
        select: {
          materialName: true,
          supplierName: true,
          quantity: true,
          unit: true,
          expDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.outwardEntry.findMany({
        select: {
          id: true,
          materialName: true,
          supplierName: true,
          quantity: true,
          unit: true,
          createdAt: true,
        },
      }),
      this.prisma.materialStock.findMany({
        select: {
          materialName: true,
          supplierName: true,
          totalQuantity: true,
          baseQuantity: true,
          unit: true,
          baseUnit: true,
        },
      }),
    ]);

    // Legacy outward rows have no supplierName. Attribute them to the supplier
    // of the inward batches behind their reserved QR codes.
    const legacyOutwardIds = outwards
      .filter((o) => !o.supplierName)
      .map((o) => o.id);
    const legacySupplierByOutward = new Map<number, string>();
    if (legacyOutwardIds.length > 0) {
      const qrs = await this.prisma.inwardQrCode.findMany({
        where: { outwardId: { in: legacyOutwardIds } },
        select: { outwardId: true, inward: { select: { supplierName: true } } },
      });
      for (const qr of qrs) {
        if (qr.outwardId && qr.inward?.supplierName) {
          legacySupplierByOutward.set(qr.outwardId, qr.inward.supplierName);
        }
      }
    }

    type MaterialRow = {
      materialName: string;
      supplierName: string | null;
      unit: DisplayUnit;
      totalInward: number;
      totalOutward: number;
      currentStock: number;
      lastInward: Date | null;
      lastOutward: Date | null;
      activeInward: number;
      expiredInward: number;
      batchCount: number;
      expiredBatchCount: number;
    };

    const materialMap = new Map<string, MaterialRow>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const supplierKey = (supplier?: string | null) =>
      supplier?.trim().toLowerCase() ?? '';

    const rowKey = (
      materialName: string,
      supplier: string | null | undefined,
      unit: DisplayUnit
    ) => `${materialName.trim().toLowerCase()}|${supplierKey(supplier)}|${unit}`;

    for (const inward of inwards) {
      const unit = toDisplayUnit(inward.unit);
      if (filter && unit !== filter) continue;

      const key = rowKey(inward.materialName, inward.supplierName, unit);
      let material = materialMap.get(key);

      if (!material) {
        material = {
          materialName: inward.materialName,
          supplierName: inward.supplierName ?? null,
          unit,
          totalInward: 0,
          totalOutward: 0,
          currentStock: 0,
          lastInward: null,
          lastOutward: null,
          activeInward: 0,
          expiredInward: 0,
          batchCount: 0,
          expiredBatchCount: 0,
        };
        materialMap.set(key, material);
      }

      material.totalInward += toDisplayQuantity(
        inward.quantity,
        inward.unit,
        6
      );
      material.batchCount += 1;

      // Classify each inward batch by its own expiry date so a material
      // with a mix of expired and valid batches keeps both quantities.
      const batchExpiry = inward.expDate ? new Date(inward.expDate) : null;
      if (batchExpiry && batchExpiry < today) {
        material.expiredBatchCount += 1;
        material.expiredInward += toDisplayQuantity(
          inward.quantity,
          inward.unit,
          6
        );
      } else {
        material.activeInward += toDisplayQuantity(
          inward.quantity,
          inward.unit,
          6
        );
      }

      if (
        !material.lastInward ||
        new Date(inward.createdAt) > new Date(material.lastInward)
      ) {
        material.lastInward = inward.createdAt;
      }
    }

    // Stock rows may exist for a material/supplier without matching inward
    // rows (legacy data). Keep positive balances visible only for materials
    // that have no inward history at all; otherwise the material-level ledger
    // row would duplicate the supplier-wise inward/outward position.
    const inwardMaterialKeys = new Set(
      inwards.map(
        (inward) =>
          `${inward.materialName.trim().toLowerCase()}|${toDisplayUnit(
            inward.unit
          )}`
      )
    );

    for (const stock of stocks) {
      const resolved = resolveStockQuantity(stock);
      if (filter && resolved.unit !== filter) continue;
      if (resolved.quantity <= 0) continue;
      if (
        inwardMaterialKeys.has(
          `${stock.materialName.trim().toLowerCase()}|${resolved.unit}`
        )
      ) {
        continue;
      }

      const key = rowKey(stock.materialName, stock.supplierName, resolved.unit);
      if (!materialMap.has(key)) {
        materialMap.set(key, {
          materialName: stock.materialName,
          supplierName: stock.supplierName ?? null,
          unit: resolved.unit,
          totalInward: resolved.quantity,
          totalOutward: 0,
          currentStock: 0,
          lastInward: null,
          lastOutward: null,
          activeInward: 0,
          expiredInward: 0,
          batchCount: 0,
          expiredBatchCount: 0,
        });
      }
    }

    for (const outward of outwards) {
      const unit = toDisplayUnit(outward.unit);
      if (filter && unit !== filter) continue;

      const supplier =
        outward.supplierName ?? legacySupplierByOutward.get(outward.id) ?? null;
      const material = materialMap.get(
        rowKey(outward.materialName, supplier, unit)
      );
      if (!material) continue;

      material.totalOutward += toDisplayQuantity(
        outward.quantity,
        outward.unit,
        6
      );

      if (
        !material.lastOutward ||
        new Date(outward.createdAt) > new Date(material.lastOutward)
      ) {
        material.lastOutward = outward.createdAt;
      }
    }

    const rows = Array.from(materialMap.values()).map((material) => ({
      materialName: material.materialName,
      supplierName: material.supplierName,
      unit: material.unit,
      totalInward: round(material.totalInward),
      totalOutward: round(material.totalOutward),
      currentStock: round(Math.max(0, material.totalInward - material.totalOutward)),
      lastInward: material.lastInward,
      lastOutward: material.lastOutward,
      suppliers: material.supplierName ? [material.supplierName] : [],
      status: material.totalInward - material.totalOutward > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      // Fully expired only when every batch has passed its expiry date.
      // Mixed materials stay active because they still have usable stock.
      expired:
        material.batchCount > 0 &&
        material.expiredBatchCount === material.batchCount,
      expiredQuantity: round(material.expiredInward),
      activeQuantity: round(material.activeInward),
      batchCount: material.batchCount,
      expiredBatchCount: material.expiredBatchCount,
    }));

    rows.sort((a, b) => {
      if (!filter) {
        const unitDiff = UNIT_ORDER[a.unit] - UNIT_ORDER[b.unit];
        if (unitDiff !== 0) return unitDiff;
      }

      const stockDiff = b.currentStock - a.currentStock;
      if (stockDiff !== 0) return stockDiff;

      const nameDiff = a.materialName.localeCompare(b.materialName);
      if (nameDiff !== 0) return nameDiff;

      return (a.supplierName ?? '').localeCompare(b.supplierName ?? '');
    });

    return rows;
  }

  // --------------------------------------------------
  // SINGLE MATERIAL HISTORY
  // --------------------------------------------------
  async getMaterialHistory(materialName: string, supplierName?: string) {
    const decodedName = decodeURIComponent(materialName);

    const inwards = await this.prisma.inwardEntry.findMany({
      where: {
        materialName: {
          equals: decodedName,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (inwards.length === 0) {
      throw new NotFoundException('Material not found');
    }

    const outwards = await this.prisma.outwardEntry.findMany({
      where: {
        materialName: {
          equals: decodedName,
          mode: 'insensitive',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Outward rows carry the supplier of the source inward. Older rows have no
    // supplier and are matched through the inward behind their QR codes.
    let filteredOutwards = outwards;
    if (supplierName) {
      const wanted = supplierName.trim().toLowerCase();
      const legacyIds = outwards
        .filter((o) => !o.supplierName)
        .map((o) => o.id);
      const legacyMatches = new Set<number>();
      if (legacyIds.length > 0) {
        const qrs = await this.prisma.inwardQrCode.findMany({
          where: {
            outwardId: { in: legacyIds },
            inward: {
              supplierName: { equals: supplierName, mode: 'insensitive' },
            },
          },
          select: { outwardId: true },
        });
        for (const qr of qrs) {
          if (qr.outwardId) legacyMatches.add(qr.outwardId);
        }
      }

      filteredOutwards = outwards.filter((o) =>
        o.supplierName
          ? o.supplierName.trim().toLowerCase() === wanted
          : legacyMatches.has(o.id)
      );
    }

    const unit = toDisplayUnit(inwards[0].unit);

    const totalInward = inwards.reduce(
      (sum, item) => sum + toDisplayQuantity(item.quantity, item.unit, 6),
      0
    );

    const totalOutward = filteredOutwards.reduce(
      (sum, item) => sum + toDisplayQuantity(item.quantity, item.unit, 6),
      0
    );

    // The dialog shows inward and outward ledgers side by side, so the stock
    // shown must reconcile with those totals.
    const currentStock = Math.max(0, round(totalInward - totalOutward));

    return {
      materialName: inwards[0].materialName,
      unit,

      totalInward: round(totalInward),
      totalOutward: round(totalOutward),

      currentStock: round(currentStock),

      status: currentStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',

      inwardHistory: inwards.map((item) => ({
        id: item.id,

        date: item.createdAt,

        supplierName: item.supplierName,

        batchNumber: item.batchNumber,

        quantity: item.quantity,

        unit: item.unit,

        mfgDate: item.mfgDate,

        expDate: item.expDate,

        status: item.status,
      })),

      outwardHistory: filteredOutwards.map((item) => ({
        id: item.id,

        date: item.createdAt,

        supplierName: item.supplierName,

        quantity: item.quantity,

        unit: item.unit,

        issuedTo: item.issuedTo,

        purpose: item.purpose,

        status: item.status,

        remarks: item.remarks,
      })),
    };
  }

  // --------------------------------------------------
  // INWARD VS OUTWARD TREND - unit separated
  // --------------------------------------------------
  async getTrend(unitFilter?: string) {
    const filter = parseUnitFilter(unitFilter);

    const [inwards, outwards] = await Promise.all([
      this.prisma.inwardEntry.findMany({
        select: {
          quantity: true,
          createdAt: true,
          unit: true,
        },
      }),
      this.prisma.outwardEntry.findMany({
        select: {
          quantity: true,
          createdAt: true,
          unit: true,
        },
      }),
    ]);

    type TrendRow = {
      month: string;
      sortDate: Date;
      byUnit: Record<DisplayUnit, { inward: number; outward: number }>;
    };

    const monthMap = new Map<string, TrendRow>();

    const touchMonth = (date: Date): TrendRow => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: date.toLocaleString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          sortDate: new Date(date.getFullYear(), date.getMonth(), 1),
          byUnit: emptyUnitRecord(() => ({ inward: 0, outward: 0 })),
        });
      }

      return monthMap.get(key)!;
    };

    const addRecord = (
      date: Date,
      type: 'inward' | 'outward',
      quantity: number,
      unit?: string | null
    ) => {
      const record = touchMonth(new Date(date));
      const displayUnit = toDisplayUnit(unit);

      record.byUnit[displayUnit][type] += toDisplayQuantity(
        quantity,
        unit,
        6
      );
    };

    for (const inward of inwards) {
      addRecord(
        inward.createdAt,
        'inward',
        Number(inward.quantity),
        inward.unit
      );
    }

    for (const outward of outwards) {
      addRecord(
        outward.createdAt,
        'outward',
        Number(outward.quantity),
        outward.unit
      );
    }

    return Array.from(monthMap.values())
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ byUnit, month }) => {
        for (const unit of DISPLAY_UNITS) {
          byUnit[unit].inward = round(byUnit[unit].inward);
          byUnit[unit].outward = round(byUnit[unit].outward);
        }

        // Flat values keep the main dashboard working. When a unit filter is
        // supplied they represent that unit only.
        const inward = filter
          ? byUnit[filter].inward
          : round(
              DISPLAY_UNITS.reduce((sum, unit) => sum + byUnit[unit].inward, 0)
            );
        const outward = filter
          ? byUnit[filter].outward
          : round(
              DISPLAY_UNITS.reduce((sum, unit) => sum + byUnit[unit].outward, 0)
            );

        return { month, inward, outward, byUnit };
      });
  }

  // --------------------------------------------------
  // TOP MATERIALS BY CURRENT STOCK
  // --------------------------------------------------
  async getTopMaterials(unitFilter?: string) {
    const filter = parseUnitFilter(unitFilter);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [inwards, outwards] = await Promise.all([
      this.prisma.inwardEntry.findMany({
        select: {
          materialName: true,
          quantity: true,
          unit: true,
          expDate: true,
        },
      }),
      this.prisma.outwardEntry.findMany({
        select: { materialName: true, quantity: true, unit: true },
      }),
    ]);

    type TopRow = {
      materialName: string;
      unit: DisplayUnit;
      inward: number;
      outward: number;
      hasActive: boolean;
      hasExpired: boolean;
    };

    const rows = new Map<string, TopRow>();
    const keyOf = (materialName: string, unit: DisplayUnit) =>
      `${materialName.trim().toLowerCase()}|${unit}`;

    for (const inward of inwards) {
      const unit = toDisplayUnit(inward.unit);
      if (filter && unit !== filter) continue;

      const key = keyOf(inward.materialName, unit);
      const row = rows.get(key) ?? {
        materialName: inward.materialName.trim(),
        unit,
        inward: 0,
        outward: 0,
        hasActive: false,
        hasExpired: false,
      };

      row.inward += toDisplayQuantity(inward.quantity, inward.unit, 6);
      if (inward.expDate && new Date(inward.expDate) < today) {
        row.hasExpired = true;
      } else {
        row.hasActive = true;
      }

      rows.set(key, row);
    }

    for (const outward of outwards) {
      const unit = toDisplayUnit(outward.unit);
      if (filter && unit !== filter) continue;

      const row = rows.get(keyOf(outward.materialName, unit));
      if (!row) continue;

      row.outward += toDisplayQuantity(outward.quantity, outward.unit, 6);
    }

    return Array.from(rows.values())
      .filter((row) => !(row.hasExpired && !row.hasActive))
      .map((row) => ({
        materialName: row.materialName,
        unit: row.unit,
        quantity: round(Math.max(0, row.inward - row.outward)),
      }))
      .filter((row) => row.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }
}
