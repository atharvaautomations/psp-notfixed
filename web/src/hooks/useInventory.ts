'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type DisplayUnit = 'KG' | 'LITRE' | 'NOS';

export type UnitFilter = 'All Units' | DisplayUnit;

export const UNIT_LABELS: Record<DisplayUnit, string> = {
  KG: 'KG',
  LITRE: 'LTR',
  NOS: 'NOS',
};

export const UNIT_FILTER_OPTIONS: Array<{
  value: UnitFilter;
  label: string;
}> = [
  { value: 'All Units', label: 'All Units' },
  { value: 'KG', label: 'KG' },
  { value: 'LITRE', label: 'LTR' },
  { value: 'NOS', label: 'NOS' },
];

export function parseUnitFilter(value?: string | null): UnitFilter {
  if (!value) return 'All Units';

  const raw = value.trim().toUpperCase();
  if (raw === 'KG' || raw === 'GRAM') return 'KG';
  if (raw === 'LTR' || raw === 'LITRE' || raw === 'ML') return 'LITRE';
  if (raw === 'NOS' || raw === 'PCS') return 'NOS';

  return 'All Units';
}

export type UnitSummary = {
  inward: number;
  outward: number;
  currentStock: number;
};

export type InventorySummary = {
  totalInward: number;
  totalOutward: number;
  currentStock: number;
  totalMaterials: number;
  materialsInStock: number;
  materialsExpired: number;
  byUnit: Record<DisplayUnit, UnitSummary>;
};

export type InventoryMaterial = {
  materialName: string;
  supplierName: string | null;
  unit: DisplayUnit;
  totalInward: number;
  totalOutward: number;
  currentStock: number;
  lastInward: string | null;
  lastOutward: string | null;
  suppliers: string[];
  status: 'IN_STOCK' | 'OUT_OF_STOCK';
  expired: boolean;
  expiredQuantity: number;
  activeQuantity: number;
  batchCount: number;
  expiredBatchCount: number;
};

export type InventoryTrendItem = {
  month: string;
  inward: number;
  outward: number;
  byUnit?: Record<DisplayUnit, { inward: number; outward: number }>;
};

export type TopMaterial = {
  materialName: string;
  quantity: number;
  unit: string;
};

export type MaterialHistory = {
  materialName: string;
  unit: DisplayUnit;

  totalInward: number;
  totalOutward: number;
  currentStock: number;

  status: 'IN_STOCK' | 'OUT_OF_STOCK';

  inwardHistory: {
    id: number;
    date: string;
    supplierName: string;
    batchNumber: string | null;
    quantity: number;
    unit: string;
    mfgDate: string;
    expDate: string;
    status: string;
  }[];

  outwardHistory: {
    id: number;
    date: string;
    supplierName?: string | null;
    quantity: number;
    unit: string;
    issuedTo: string;
    purpose: string | null;
    status: string;
    remarks: string | null;
  }[];
};

export type InventoryFilters = {
  unit?: UnitFilter;
  enabled?: boolean;
};

function unitParam(unit?: UnitFilter) {
  return unit && unit !== 'All Units' ? unit : null;
}

export function useInventorySummary() {
  return useQuery<InventorySummary>({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => {
      const res = await api.get('/inventory/summary');
      return res.data;
    },
  });
}

export function useInventoryMaterials(filters?: InventoryFilters) {
  const unit = unitParam(filters?.unit);

  return useQuery<InventoryMaterial[]>({
    queryKey: ['inventory', 'materials', unit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unit) params.append('unit', unit);

      const res = await api.get(`/inventory/materials?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: filters?.enabled ?? true,
  });
}

export function useInventoryTrend(filters?: InventoryFilters) {
  const unit = unitParam(filters?.unit);

  return useQuery<InventoryTrendItem[]>({
    queryKey: ['inventory', 'trend', unit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unit) params.append('unit', unit);

      const res = await api.get(`/inventory/trend?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: filters?.enabled ?? true,
  });
}

export function useTopInventoryMaterials(filters?: InventoryFilters) {
  const unit = unitParam(filters?.unit);

  return useQuery<TopMaterial[]>({
    queryKey: ['inventory', 'top-materials', unit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unit) params.append('unit', unit);

      const res = await api.get(`/inventory/top-materials?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: filters?.enabled ?? true,
  });
}

export function useMaterialInventoryHistory(
  materialName: string | null,
  supplierName?: string
) {
  return useQuery<MaterialHistory>({
    queryKey: ['inventory', 'material-history', materialName, supplierName],
    queryFn: async () => {
      if (!materialName) throw new Error('Material name is required');

      const params = new URLSearchParams();
      if (supplierName) params.append('supplierName', supplierName);

      const res = await api.get(
        `/inventory/materials/${encodeURIComponent(materialName)}/history?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!materialName,
  });
}
