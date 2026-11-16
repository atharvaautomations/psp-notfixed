// src/utils/units.ts

import type { UnitType } from '@/types/inward';

export const BASE_MASS_UNIT: UnitType = 'KG';
export const BASE_VOLUME_UNIT: UnitType = 'LITRE';

export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return NaN;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function normalizeUnit(unit: UnitType | undefined | null): UnitType {
  if (!unit) return 'KG';
  if (unit === 'LITRE') return 'LITRE';
  return unit as UnitType;
}
