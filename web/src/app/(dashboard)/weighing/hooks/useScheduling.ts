'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import {
  ScheduleItem,
  ScheduleFormData,
  ExecutionOption,
  OperatorOption,
} from '../types/schedule';

export const SCHEDULE_QUERY_KEYS = {
  all: ['schedules'] as const,
  list: (filters?: Record<string, any>) => ['schedules', 'list', filters] as const,
  mySchedules: (filters?: Record<string, any>) => ['schedules', 'my', filters] as const,
  executions: ['schedules', 'executions'] as const,
  operators: ['schedules', 'operators'] as const,
};

interface ScheduleListResponse {
  schedules: ScheduleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useSchedules(filters?: {
  status?: string;
  fromDate?: string;
  toDate?: string;
  operatorId?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery<ScheduleListResponse>({
    queryKey: SCHEDULE_QUERY_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.operatorId) params.append('operatorId', filters.operatorId.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const res = await api.get(`/scheduling?${params.toString()}`);
      return res.data;
    },
  });
}

export function useMySchedules(filters?: {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<ScheduleListResponse>({
    queryKey: SCHEDULE_QUERY_KEYS.mySchedules(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const res = await api.get(`/scheduling/my-schedules?${params.toString()}`);
      return res.data;
    },
  });
}

export function useAvailableExecutions() {
  return useQuery<ExecutionOption[]>({
    queryKey: SCHEDULE_QUERY_KEYS.executions,
    queryFn: async () => {
      const res = await api.get('/scheduling/executions');
      return res.data;
    },
  });
}

export function useAvailableOperators() {
  return useQuery<OperatorOption[]>({
    queryKey: SCHEDULE_QUERY_KEYS.operators,
    queryFn: async () => {
      const res = await api.get('/scheduling/operators');
      return res.data;
    },
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      return api.post('/scheduling', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEYS.all });
      toast({
        title: 'Schedule created',
        description: 'The schedule has been created successfully.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error creating schedule',
        description: err?.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}

export function useScheduleDetail(id: number) {
  return useQuery<ScheduleItem>({
    queryKey: ['schedules', 'detail', id],
    queryFn: async () => {
      const res = await api.get(`/scheduling/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useRefreshScheduleStatuses() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api.post('/scheduling/refresh-statuses');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEYS.all });
      toast({
        title: 'Statuses refreshed',
        description: 'Schedule statuses have been updated.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error refreshing statuses',
        description: err?.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}