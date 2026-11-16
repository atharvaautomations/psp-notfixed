/**
 * Centralized Unit Conversion Utility for Jayshree Polymer MES
 *
 * Base units:
 *   GRAM (g)   - for mass (KG → GRAM)
 *   ML (ml)    - for volume (Litre → ML)
 *   NOS        - for count (unchanged)
 *
 * All quantities are stored in base units in the database.
 * Frontend sends display units; backend converts to base units before persisting.
 */

export type UnitType = 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'NOS';

export interface ConversionResult {
  value: number;
  unit: UnitType;
}

/**
 * Map of aliases to canonical unit names.
 */
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

/**
 * Normalize a unit string to a canonical UnitType.
 * Throws if the unit is not recognized.
 */
export function normalizeUnit(unit: string | undefined | null): UnitType {
  if (!unit) return 'KG';
  const trimmed = unit.trim();
  const mapped = UNIT_ALIASES[trimmed];
  if (mapped) return mapped;
  // If it's already a canonical value, return it
  if (['KG', 'GRAM', 'LITRE', 'ML', 'NOS'].includes(trimmed)) {
    return trimmed as UnitType;
  }
  // Default fallback
  return 'KG';
}

/**
 * Get the base unit for a given unit type.
 */
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

/**
 * Convert a quantity from any unit to its base unit.
 *
 * KG  → GRAM: multiply by 1000
 * LITRE → ML: multiply by 1000
 * NOS  → NOS: unchanged
 * GRAM → GRAM: unchanged
 * ML   → ML: unchanged
 */
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

/**
 * Convert a quantity from base unit to a display unit.
 *
 * GRAM → KG: divide by 1000
 * ML → LITRE: divide by 1000
 * NOS → NOS: unchanged
 */
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

/**
 * Validate that a quantity is valid for the given unit.
 */
export function validateQuantity(quantity: number, unit: UnitType): { valid: boolean; error?: string } {
  if (!Number.isFinite(quantity)) {
    return { valid: false, error: 'Quantity must be a valid number' };
  }
  if (quantity < 0) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }
  return { valid: true };
}

/**
 * Round a number to a specific number of decimal places to avoid
 * floating-point representation errors.
 */
function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format a quantity for display with appropriate precision.
 */
export function formatQuantity(value: number, unit: UnitType): string {
  if (!Number.isFinite(value)) return '0';
  const decimals = unit === 'NOS' ? 0 : 3;
  return value.toFixed(decimals).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}
