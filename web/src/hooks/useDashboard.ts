'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type DashboardSummary = {
  totalInward: number;
  totalOutward: number;
  currentStock: number;
  totalMaterials: number;
  materialsInStock: number;
  materialsExpired: number;
  byUnit?: Record<string, { inward: number; outward: number; currentStock: number }>;
};

export type DashboardActivity = {
  id: number;
  type: 'inward' | 'outward';
  materialName: string;
  partyName: string;
  quantity: number;
  unit: string;
  date: string;
  status: string;
};

export type DashboardTrendItem = {
  month: string;
  inward: number;
  outward: number;
  byUnit?: Record<string, { inward: number; outward: number }>;
};

export type DashboardTopMaterial = {
  materialName: string;
  quantity: number;
  unit: string;
};

export type DashboardFilters = {
  unit?: string;
};

function unitParam(unit?: string) {
  return unit && unit !== 'All Units' ? unit : null;
}

export function useDashboardSummary(filters?: DashboardFilters) {
  const unit = unitParam(filters?.unit);

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', unit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unit) params.append('unit', unit);

      const res = await api.get(`/inventory/summary?${params.toString()}`);
      return Array.isArray(res.data) ? res.data[0] : res.data;
    },
    enabled: true,
  });
}

export function useDashboardActivity(filters?: DashboardFilters) {
  const unit = unitParam(filters?.unit);

  return useQuery<DashboardActivity[]>({
    queryKey: ['dashboard', 'activity', unit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unit) params.append('unit', unit);

      const [inwardRes, outwardRes] = await Promise.all([
        api.get(`/inward?${params.toString()}`),
        api.get(`/outward?${params.toString()}`),
      ]);

      const inwardData = Array.isArray(inwardRes.data) ? inwardRes.data : [];
      const outwardData = Array.isArray(outwardRes.data) ? outwardRes.data : [];

      const activities: DashboardActivity[] = [
        ...inwardData.map((item: any) => ({
          id: item.id,
          type: 'inward' as const,
          materialName: item.materialName,
          partyName: item.supplierName,
          quantity: Number(item.quantity),
          unit: item.unit,
          date: item.createdAt,
          status: item.status || 'Active',
        })),
        ...outwardData.map((item: any) => ({
          id: item.id,
          type: 'outward' as const,
          materialName: item.materialName,
          partyName: item.recipient || 'N/A',
          quantity: Number(item.quantity || 0),
          unit: item.unit || 'KG',
          date: item.createdAt,
          status: item.status || 'Pending',
        })),
      ];

      activities.sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return activities.slice(0, 10);
    },
  });
}

export function useDashboardTrend(filters?: DashboardFilters) {
  const unit = unitParam(filters?.unit);

  return useQuery<DashboardTrendItem[]>({
    queryKey: ['dashboard', 'trend', unit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unit) params.append('unit', unit);

      const res = await api.get(`/inventory/trend?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function useDashboardTopMaterials(filters?: DashboardFilters) {
  const unit = unitParam(filters?.unit);

  return useQuery<DashboardTopMaterial[]>({
    queryKey: ['dashboard', 'top-materials', unit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unit) params.append('unit', unit);

      const res = await api.get(`/inventory/top-materials?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}
