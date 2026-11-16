import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeUnit } from '../utils/unit-conversion';
import { AlertStatus, AlertType } from './dto/alert-status.dto';

const MIN_STOCK_THRESHOLDS = [15, 10, 5];
const EXPIRY_DAYS_THRESHOLDS = [15, 7, 3, 1];
const DAY_MS = 1000 * 60 * 60 * 24;

type DisplayUnit = 'KG' | 'LITRE' | 'NOS';

function round(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function toDisplayUnit(unit?: string | null): DisplayUnit {
  const normalized = normalizeUnit(unit);
  if (normalized === 'GRAM' || normalized === 'KG') return 'KG';
  if (normalized === 'ML' || normalized === 'LITRE') return 'LITRE';
  return 'NOS';
}

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

function formatDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${value.getFullYear()}`;
}

function materialKey(
  materialName: string,
  supplierName: string | null,
  unit: DisplayUnit
): string {
  return `${materialName.trim().toLowerCase()}|${
    supplierName?.trim().toLowerCase() ?? ''
  }|${unit}`;
}

type MaterialUnitStock = {
  materialName: string;
  supplierName: string | null;
  unit: DisplayUnit;
  totalInward: number;
  totalOutward: number;
};

@Injectable()
export class AlertService {
  // A minimum stock alert is re-armed only after stock recovers above its
  // threshold again, so manually clearing an alert does not immediately
  // re-create it while the stock is still low.
  private readonly minStockArmed = new Map<string, boolean>();

  // Generation runs are serialised so two page loads cannot insert the
  // same alert at the same time.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  // --------------------------------------------------
  // GENERATE ALERTS - also runs automatically on every fetch
  // --------------------------------------------------
  async generateAlerts(unitFilter?: string) {
    const filter = parseUnitFilter(unitFilter);

    await this.enqueue(async () => {
      const stock = await this.loadStock(filter);
      await this.generateMinStockAlerts(stock);
      await this.generateExpiryAlerts(filter, stock);
    });

    return { message: 'Alerts generated successfully' };
  }

  // --------------------------------------------------
  // STOCK SNAPSHOT - same basis as the inventory dashboard
  // (inward - outward), so alerts match the displayed stock.
  // --------------------------------------------------
  private async loadStock(filter: DisplayUnit | null) {
    const [inwards, outwards] = await Promise.all([
      this.prisma.inwardEntry.findMany({
        select: {
          materialName: true,
          supplierName: true,
          quantity: true,
          unit: true,
        },
      }),
      this.prisma.outwardEntry.findMany({
        select: {
          id: true,
          materialName: true,
          supplierName: true,
          quantity: true,
          unit: true,
        },
      }),
    ]);

    // Legacy outward rows have no supplier; attribute them through the inward
    // behind their QR codes so supplier-wise stock stays accurate.
    const legacyIds = outwards.filter((o) => !o.supplierName).map((o) => o.id);
    const legacySupplier = new Map<number, string>();
    if (legacyIds.length > 0) {
      const qrs = await this.prisma.inwardQrCode.findMany({
        where: { outwardId: { in: legacyIds } },
        select: { outwardId: true, inward: { select: { supplierName: true } } },
      });
      for (const qr of qrs) {
        if (qr.outwardId && qr.inward?.supplierName) {
          legacySupplier.set(qr.outwardId, qr.inward.supplierName);
        }
      }
    }

    const stock = new Map<string, MaterialUnitStock>();

    for (const inward of inwards) {
      const unit = toDisplayUnit(inward.unit);
      if (filter && unit !== filter) continue;

      const supplierName = inward.supplierName?.trim() || null;
      const key = materialKey(inward.materialName, supplierName, unit);
      const qty = toDisplayQuantity(Number(inward.quantity), inward.unit, 6);
      const existing = stock.get(key);

      if (existing) {
        existing.totalInward += qty;
      } else {
        stock.set(key, {
          materialName: inward.materialName.trim(),
          supplierName,
          unit,
          totalInward: qty,
          totalOutward: 0,
        });
      }
    }

    for (const outward of outwards) {
      const unit = toDisplayUnit(outward.unit);
      if (filter && unit !== filter) continue;

      const supplierName =
        outward.supplierName?.trim() ||
        legacySupplier.get(outward.id) ||
        null;
      const entry = stock.get(
        materialKey(outward.materialName, supplierName, unit)
      );
      if (!entry) continue;

      entry.totalOutward += toDisplayQuantity(
        Number(outward.quantity),
        outward.unit,
        6
      );
    }

    return stock;
  }

  private currentStock(entry: MaterialUnitStock): number {
    return Math.max(0, round(entry.totalInward - entry.totalOutward, 6));
  }

  // --------------------------------------------------
  // MINIMUM STOCK ALERTS (15%, 10%, 5% of inward stock)
  // --------------------------------------------------
  private async generateMinStockAlerts(
    stock: Map<string, MaterialUnitStock>
  ) {
    // --- Auto-clear: clear Active MIN_STOCK alerts whose stock recovered ---
    const activeMinStockAlerts = await this.prisma.alert.findMany({
      where: {
        type: AlertType.MIN_STOCK,
        status: AlertStatus.ACTIVE,
      },
    });

    // Alerts created before supplier separation have no supplier. They are
    // matched against the combined stock of the material to stay clearable.
    const combined = new Map<
      string,
      { totalInward: number; totalOutward: number }
    >();
    for (const entry of stock.values()) {
      const key = `${entry.materialName.trim().toLowerCase()}|${entry.unit}`;
      const agg = combined.get(key) ?? { totalInward: 0, totalOutward: 0 };
      agg.totalInward += entry.totalInward;
      agg.totalOutward += entry.totalOutward;
      combined.set(key, agg);
    }

    for (const alert of activeMinStockAlerts) {
      const unit = toDisplayUnit(alert.unit);
      const percent = alert.threshold ?? 0;
      let current: number;
      let thresholdQty: number;

      if (alert.supplierName) {
        const entry = stock.get(
          materialKey(alert.materialName, alert.supplierName, unit)
        );
        if (!entry) continue;
        current = this.currentStock(entry);
        thresholdQty = round((entry.totalInward * percent) / 100, 6);
      } else {
        const agg = combined.get(
          `${alert.materialName.trim().toLowerCase()}|${unit}`
        );
        if (!agg) continue;
        current = Math.max(0, round(agg.totalInward - agg.totalOutward, 6));
        thresholdQty = round((agg.totalInward * percent) / 100, 6);
      }

      // Stock recovered above the threshold: clear the alert automatically.
      // Only this supplier's alert is cleared, not alerts of other suppliers.
      if (current > thresholdQty) {
        await this.prisma.alert.update({
          where: { id: alert.id },
          data: {
            status: AlertStatus.CLEARED,
            clearedAt: new Date(),
          },
        });
      }
    }

    // --- Generate new alerts ---
    for (const [key, entry] of stock) {
      const { materialName, supplierName, unit, totalInward } = entry;
      if (totalInward <= 0) continue;

      const current = this.currentStock(entry);

      for (const threshold of MIN_STOCK_THRESHOLDS) {
        const armKey = `${key}|${threshold}`;
        const thresholdQty = round((totalInward * threshold) / 100, 6);
        const supplierFilter = supplierName
          ? {
              supplierName: {
                equals: supplierName,
                mode: 'insensitive' as const,
              },
            }
          : { supplierName: null };

        // Stock recovered above the threshold: the next dip is a new event.
        if (current > thresholdQty) {
          this.minStockArmed.set(armKey, true);
          continue;
        }

        // Already alerted during this dip and not manually re-armed. Verify
        // the alert still exists before suppressing a re-run.
        if (this.minStockArmed.get(armKey) === false) {
          const stillExists = await this.prisma.alert.findFirst({
            where: {
              materialName: { equals: materialName, mode: 'insensitive' },
              unit,
              type: AlertType.MIN_STOCK,
              threshold,
              ...supplierFilter,
            },
            select: { id: true },
          });

          if (stillExists) continue;
        }

        const existingActive = await this.prisma.alert.findFirst({
          where: {
            materialName: { equals: materialName, mode: 'insensitive' },
            unit,
            type: AlertType.MIN_STOCK,
            threshold,
            status: AlertStatus.ACTIVE,
            ...supplierFilter,
          },
        });

        if (existingActive) {
          this.minStockArmed.set(armKey, false);
          continue;
        }

        if (this.minStockArmed.get(armKey) === undefined) {
          // First run in this process: honour alerts already handled
          // (Active or Cleared) for the same material/supplier/threshold.
          const previous = await this.prisma.alert.findFirst({
            where: {
              materialName: { equals: materialName, mode: 'insensitive' },
              unit,
              type: AlertType.MIN_STOCK,
              threshold,
              ...supplierFilter,
            },
          });

          if (previous) {
            this.minStockArmed.set(armKey, false);
            continue;
          }
        }

        const supplierLabel = supplierName ? ` from supplier "${supplierName}"` : '';

        await this.prisma.alert.create({
          data: {
            title: `Minimum Stock Alert - ${threshold}%`,
            description: `Material "${materialName}"${supplierLabel} (${unit}) stock is ${round(
              current
            )} ${unit}, which is at or below ${threshold}% of inward stock (${thresholdQty} ${unit}).`,
            type: AlertType.MIN_STOCK,
            materialName,
            supplierName,
            unit,
            threshold,
            status: AlertStatus.ACTIVE,
          },
        });

        this.minStockArmed.set(armKey, false);
      }
    }
  }

  // --------------------------------------------------
  // EXPIRY ALERTS (15, 7, 3, 1 days before expiry + expired)
  // --------------------------------------------------
  private async generateExpiryAlerts(
    filter: DisplayUnit | null,
    stock: Map<string, MaterialUnitStock>
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inwards = await this.prisma.inwardEntry.findMany({
      select: {
        materialName: true,
        supplierName: true,
        batchNumber: true,
        expDate: true,
        unit: true,
        quantity: true,
      },
    });

    for (const inward of inwards) {
      if (!inward.expDate) continue;

      const unit = toDisplayUnit(inward.unit);
      if (filter && unit !== filter) continue;

      const supplierName = inward.supplierName?.trim() || null;

      // Nothing left of this material/supplier/unit to expire.
      const entry = stock.get(
        materialKey(inward.materialName, supplierName, unit)
      );
      if (!entry || this.currentStock(entry) <= 0) continue;

      const expiry = new Date(inward.expDate);
      const expiryDay = new Date(
        expiry.getFullYear(),
        expiry.getMonth(),
        expiry.getDate()
      );
      const daysUntilExpiry = Math.round(
        (expiryDay.getTime() - today.getTime()) / DAY_MS
      );

      const materialName = inward.materialName.trim();
      const batchNumber = inward.batchNumber?.trim() || null;

      if (daysUntilExpiry < 0) {
        const alreadyAlerted = await this.prisma.alert.findFirst({
          where: {
            materialName: { equals: materialName, mode: 'insensitive' },
            supplierName,
            unit,
            type: AlertType.EXPIRY,
            threshold: 0,
            expiryDate: inward.expDate,
            batchNumber,
          },
        });

        if (alreadyAlerted) continue;

        await this.prisma.alert.create({
          data: {
            title: 'Material Expired',
            description: `Material "${materialName}"${
              supplierName ? ` from supplier "${supplierName}"` : ''
            }${
              batchNumber ? ` batch ${batchNumber}` : ''
            } (${unit}) expired on ${formatDate(
              expiryDay
            )} and must not be used.`,
            type: AlertType.EXPIRY,
            materialName,
            supplierName,
            unit,
            threshold: 0,
            batchNumber,
            expiryDate: inward.expDate,
            status: AlertStatus.ACTIVE,
          },
        });

        continue;
      }

      // Only the tightest interval that has been crossed, so a batch seen
      // for the first time at 2 days does not raise 15/7/3/1 all at once.
      const thresholdDays = [...EXPIRY_DAYS_THRESHOLDS]
        .reverse()
        .find((days) => daysUntilExpiry <= days);

      if (thresholdDays !== undefined) {
        const alreadyAlerted = await this.prisma.alert.findFirst({
          where: {
            materialName: { equals: materialName, mode: 'insensitive' },
            supplierName,
            unit,
            type: AlertType.EXPIRY,
            threshold: thresholdDays,
            expiryDate: inward.expDate,
            batchNumber,
          },
        });

        if (alreadyAlerted) continue;

        await this.prisma.alert.create({
          data: {
            title: `Expiry Alert - ${thresholdDays} Days`,
            description: `Material "${materialName}"${
              supplierName ? ` from supplier "${supplierName}"` : ''
            }${
              batchNumber ? ` batch ${batchNumber}` : ''
            } (${unit}) expires on ${formatDate(expiryDay)} - ${
              daysUntilExpiry === 0 ? 'today' : `${daysUntilExpiry} day(s) left`
            }.`,
            type: AlertType.EXPIRY,
            materialName,
            supplierName,
            unit,
            threshold: thresholdDays,
            batchNumber,
            expiryDate: inward.expDate,
            status: AlertStatus.ACTIVE,
          },
        });
      }
    }
  }

  // --------------------------------------------------
  // GET ALL ALERTS - always synced before reading
  // --------------------------------------------------
  async getAllAlerts() {
    await this.enqueue(async () => {
      const stock = await this.loadStock(null);
      await this.generateMinStockAlerts(stock);
      await this.generateExpiryAlerts(null, stock);
    });

    const alerts = await this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Never show two Active alerts for the same condition.
    const seen = new Set<string>();
    const unique: typeof alerts = [];

    for (const alert of alerts) {
      if (alert.status !== AlertStatus.ACTIVE) {
        unique.push(alert);
        continue;
      }

      const key = `${alert.type}|${alert.materialName.toLowerCase()}|${
        alert.supplierName?.toLowerCase() ?? ''
      }|${alert.unit}|${alert.threshold ?? ''}|${
        alert.expiryDate ? new Date(alert.expiryDate).getTime() : ''
      }`;

      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(alert);
    }

    // Active alerts must stay above cleared ones; within each group the
    // newest alert comes first.
    unique.sort((a, b) => {
      const aActive = a.status === AlertStatus.ACTIVE ? 0 : 1;
      const bActive = b.status === AlertStatus.ACTIVE ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return unique;
  }

  // --------------------------------------------------
  // UPDATE ALERT STATUS (manual only)
  // --------------------------------------------------
  async updateAlertStatus(id: number, status: AlertStatus) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    return this.prisma.alert.update({
      where: { id },
      data: {
        status,
        clearedAt: status === AlertStatus.CLEARED ? new Date() : null,
      },
    });
  }
}
