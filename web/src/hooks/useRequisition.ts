'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  RequisitionItem,
  RequisitionFilters,
  CreateRequisitionPayload,
  UpdateRequisitionPayload,
} from '@/types/requisition';
import { notifyGlobal } from '@/components/notifications/ToastProvider';

export const REQUISITION_QUERY_KEYS = {
  all: ['requisition'] as const,
  list: (filters?: RequisitionFilters) =>
    ['requisition', 'list', filters] as const,
  detail: (id: number) => ['requisition', 'detail', id] as const,
};

export function useRequisitionList(filters?: RequisitionFilters) {
  return useQuery<RequisitionItem[]>({
    queryKey: REQUISITION_QUERY_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status && filters.status !== 'All')
        params.append('status', filters.status);
      if (filters?.sort) params.append('sort', filters.sort);

      const res = await api.get(`/requisition?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRequisitionPayload) => {
      const res = await api.post('/requisition', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITION_QUERY_KEYS.all });
      notifyGlobal({
        type: 'success',
        message: 'Requisition created successfully',
      });
    },
    onError: () => {
      notifyGlobal({ type: 'error', message: 'Failed to create requisition' });
    },
  });
}

export function useUpdateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateRequisitionPayload }) => {
      const res = await api.patch(`/requisition/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITION_QUERY_KEYS.all });
      notifyGlobal({
        type: 'success',
        message: 'Requisition updated successfully',
      });
    },
    onError: () => {
      notifyGlobal({ type: 'error', message: 'Failed to update requisition' });
    },
  });
}

export function useDeleteRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/requisition/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITION_QUERY_KEYS.all });
      notifyGlobal({
        type: 'success',
        message: 'Requisition deleted successfully',
      });
    },
    onError: (error: any) => {
      notifyGlobal({
        type: 'error',
        message: error.response?.data?.message ?? 'Failed to delete requisition',
      });
    },
  });
}

export function useApproveRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/requisition/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITION_QUERY_KEYS.all });
      qc.invalidateQueries({ queryKey: ['outward'] });
      qc.invalidateQueries({ queryKey: ['materialStock'] });
      notifyGlobal({ type: 'success', message: 'Requisition approved' });
    },
    onError: () => {
      notifyGlobal({ type: 'error', message: 'Failed to approve requisition' });
    },
  });
}

export function useFulfillRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/requisition/${id}/fulfill`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITION_QUERY_KEYS.all });
      notifyGlobal({ type: 'success', message: 'Requisition fulfilled' });
    },
    onError: () => {
      notifyGlobal({ type: 'error', message: 'Failed to fulfill requisition' });
    },
  });
}

export function useRejectRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const res = await api.patch(`/requisition/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUISITION_QUERY_KEYS.all });
      notifyGlobal({ type: 'success', message: 'Requisition rejected' });
    },
    onError: () => {
      notifyGlobal({ type: 'error', message: 'Failed to reject requisition' });
    },
  });
}
