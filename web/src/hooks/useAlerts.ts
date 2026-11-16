'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Alert } from '@/types/alerts';

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get('/alerts');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function useGenerateAlerts() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (unit?: string) => {
      const params = new URLSearchParams();
      if (unit && unit !== 'All Units') params.append('unit', unit);

      const res = await api.post(`/alerts/generate?${params.toString()}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Alert['status'] }) => {
      const res = await api.patch(`/alerts/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
