// src/utils/unit-conversion.ts
//
// Centralized Unit Conversion Utility for Jayshree Polymer MES
//
// Base units:
//   GRAM (g)   - for mass (KG → GRAM)
//   ML (ml)    - for volume (Litre → ML)
//   NOS        - for count (unchanged)
//
// All quantities are stored in base units in the database.
// Frontend sends display units; backend converts to base units before persisting.
//

export type UnitType = 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'NOS';

export interface ConversionResult {
  value: number;
  unit: UnitType;
}

const UNIT_ALIASES: Record<string, UnitType> = {
  // Mass aliases
  kg: 'KG',
  KG: 'KG',
  gram: 'GRAM',
  GRAM: 'GRAM',
  g: 'GRAM',
  // Volume aliases
  litre: 'LITRE',
  LITRE: 'LITRE',
  L: 'LITRE',
  l: 'LITRE',
  ml: 'ML',
  ML: 'ML',
  // Count aliases
  nos: 'NOS',
  NOS: 'NOS',
  pcs: 'NOS',
  PCS: 'NOS',
  pieces: 'NOS',
  PIECES: 'NOS',
};

export function normalizeUnit(unit: string | undefined | null): UnitType {
  if (!unit) return 'KG';
  const trimmed = unit.trim();
  const mapped = UNIT_ALIASES[trimmed];
  if (mapped) return mapped;
  if (['KG', 'GRAM', 'LITRE', 'ML', 'NOS'].includes(trimmed)) {
    return trimmed as UnitType;
  }
  return 'KG';
}

export function getBaseUnit(unit: UnitType): UnitType {
  switch (unit) {
    case 'KG':
      return 'GRAM';
    case 'LITRE':
      return 'ML';
    case 'NOS':
      return 'NOS';
    case 'GRAM':
      return 'GRAM';
    case 'ML':
      return 'ML';
    default:
      return 'GRAM';
  }
}

export function convertToBaseUnit(quantity: number, unit: UnitType): number {
  if (!Number.isFinite(quantity)) return 0;
  const baseUnit = getBaseUnit(unit);
  if (baseUnit === unit) return quantity;

  switch (unit) {
    case 'KG':
      return roundToDecimals(quantity * 1000, 6);
    case 'LITRE':
      return roundToDecimals(quantity * 1000, 6);
    case 'NOS':
      return quantity;
    default:
      return quantity;
  }
}

export function convertFromBaseUnit(quantity: number, baseUnit: UnitType, targetUnit: UnitType): number {
  if (!Number.isFinite(quantity)) return 0;
  if (baseUnit === targetUnit) return quantity;

  switch (targetUnit) {
    case 'KG':
      return roundToDecimals(quantity / 1000, 6);
    case 'LITRE':
      return roundToDecimals(quantity / 1000, 6);
    case 'NOS':
      return quantity;
    default:
      return quantity;
  }
}

export function validateQuantity(quantity: number, unit: UnitType): { valid: boolean; error?: string } {
  if (!Number.isFinite(quantity)) {
    return { valid: false, error: 'Quantity must be a valid number' };
  }
  if (quantity < 0) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }
  return { valid: true };
}

function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatQuantity(value: number, unit: UnitType): string {
  if (!Number.isFinite(value)) return '0';
  const decimals = unit === 'NOS' ? 0 : 3;
  return value.toFixed(decimals).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

export const UNIT_OPTIONS: Array<{ value: UnitType; label: string }> = [
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'LITRE', label: 'Litre (Litre)' },
  { value: 'NOS', label: 'Number of Pieces (NOS)' },
];

export const UNIT_LABELS: Record<UnitType, string> = {
  KG: 'KG',
  GRAM: 'GRAM',
  LITRE: 'LITRE',
  ML: 'ML',
  NOS: 'NOS',
};
