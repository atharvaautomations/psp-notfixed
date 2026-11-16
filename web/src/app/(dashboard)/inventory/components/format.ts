import { DisplayUnit, UNIT_LABELS } from '@/hooks/useInventory';

export function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export function formatNumber(value: number, maximumFractionDigits = 3) {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

export function formatQty(value: number, unit?: string) {
  const label = unit ? UNIT_LABELS[unit as DisplayUnit] : undefined;
  return `${formatNumber(value)}${label ? ` ${label}` : ''}`;
}
