'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface HistoryEntry {
  id: number;
  moduleType: string;
  activityType: string;
  referenceId?: string | null;
  bagNumber?: number | null;
  qrId?: string | null;
  grnNumber?: string | null;
  binNumber?: string | null;
  userId?: number | null;
  username?: string | null;
  status: string;
  errorMessage?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface HistoryFilters {
  moduleType?: 'All' | 'inward' | 'outward' | 'loading';
  activityType?: string;
  userId?: number;
  status?: 'All' | 'Success' | 'Failed';
  search?: string;
  fromDate?: string;
  toDate?: string;
  sort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface HistoryResponse {
  logs: HistoryEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useHistory(filters?: HistoryFilters) {
  return useQuery<HistoryResponse>({
    queryKey: ['history', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.moduleType && filters.moduleType !== 'All')
        params.append('moduleType', filters.moduleType);
      if (filters?.activityType) params.append('activityType', filters.activityType);
      if (filters?.userId) params.append('userId', filters.userId.toString());
      if (filters?.status && filters.status !== 'All')
        params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.sort) params.append('sort', filters.sort);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const res = await api.get(`/activity-log?${params.toString()}`);
      return res.data;
    },
  });
}

export function useHistoryExport(filters?: HistoryFilters) {
  return async () => {
    const params = new URLSearchParams();

    if (filters?.moduleType && filters.moduleType !== 'All')
      params.append('moduleType', filters.moduleType);
    if (filters?.activityType) params.append('activityType', filters.activityType);
    if (filters?.userId) params.append('userId', filters.userId.toString());
    if (filters?.status && filters.status !== 'All')
      params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.sort) params.append('sort', filters.sort);

    const res = await api.get(`/activity-log/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return res.data;
  };
}
