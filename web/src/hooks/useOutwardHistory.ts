import api from '@/lib/api';
import { OutwardHistoryEntry, OutwardHistoryFilters } from '@/types/outward-history';
import { useQuery } from '@tanstack/react-query';

export function useOutwardHistoryList(filters?: OutwardHistoryFilters) {
  return useQuery<OutwardHistoryEntry[]>({
    queryKey: ['outward-history', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status && filters.status !== 'All')
        params.append('status', filters.status);
      if (filters?.sort) params.append('sort', filters.sort);

      const res = await api.get(`/outward-history?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function useOutwardHistoryDetail(outwardId: number) {
  return useQuery<OutwardHistoryEntry>({
    queryKey: ['outward-history', outwardId],
    queryFn: async () => {
      const res = await api.get(`/outward-history/${outwardId}`);
      return res.data;
    },
    enabled: !!outwardId,
  });
}
