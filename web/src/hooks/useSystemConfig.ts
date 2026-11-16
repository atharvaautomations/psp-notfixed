'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

export type HealthStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'DISABLED';

export type OverallHealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';

export interface SystemDevice {
  id: number;
  key: string;
  name: string;
  type: 'PLC' | 'PRINTER' | 'SERVER' | 'CLIENT_PC' | 'NETWORK_DEVICE' | 'OTHER';
  host: string;
  port: number | null;
  protocol: string | null;
  enabled: boolean;
  description: string | null;
  sortOrder: number;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SystemService {
  id: number;
  key: string;
  name: string;
  type:
    | 'BACKEND'
    | 'FRONTEND'
    | 'DATABASE'
    | 'PLC_SERVICE'
    | 'PRINTER_SERVICE'
    | 'OTHER';
  host: string;
  port: number;
  healthPath: string | null;
  enabled: boolean;
  description: string | null;
  sortOrder: number;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthItem {
  key: string;
  name: string;
  category: 'DEVICE' | 'SERVICE';
  status: HealthStatus;
  host: string;
  port?: number | null;
  responseTimeMs?: number | null;
  checkedAt: string;
  message?: string;
}

export interface SystemHealthResponse {
  overallStatus: OverallHealthStatus;

  summary: {
    total: number;
    online: number;
    offline: number;
    warning: number;
    disabled: number;
  };

  devices: HealthItem[];
  services: HealthItem[];

  checkedAt: string;
}

export function useSystemDevices() {
  return useQuery<SystemDevice[]>({
    queryKey: ['system-config', 'devices'],
    queryFn: async () => {
      const res = await api.get('/system-config/devices');
      return res.data;
    },
  });
}

export function useSystemServices() {
  return useQuery<SystemService[]>({
    queryKey: ['system-config', 'services'],
    queryFn: async () => {
      const res = await api.get('/system-config/services');
      return res.data;
    },
  });
}

export function useSystemSettings() {
  return useQuery<SystemSetting[]>({
    queryKey: ['system-config', 'settings'],
    queryFn: async () => {
      const res = await api.get('/system-config/settings');
      return res.data;
    },
  });
}

export function useSystemHealth() {
  return useQuery<SystemHealthResponse>({
    queryKey: ['system-config', 'health'],
    queryFn: async () => {
      const res = await api.get('/system-config/health');
      return res.data;
    },

    refetchInterval: 15000,
  });
}

export function useUpdateSystemDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      data,
    }: {
      key: string;
      data: {
        name?: string;
        host?: string;
        port?: number;
        protocol?: string;
        enabled?: boolean;
        description?: string;
      };
    }) => {
      const res = await api.patch(`/system-config/devices/${key}`, data);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['system-config', 'devices'],
      });

      queryClient.invalidateQueries({
        queryKey: ['system-config', 'health'],
      });
    },
  });
}

export function useUpdateSystemService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      data,
    }: {
      key: string;
      data: {
        name?: string;
        host?: string;
        port?: number;
        healthPath?: string;
        enabled?: boolean;
        description?: string;
      };
    }) => {
      const res = await api.patch(`/system-config/services/${key}`, data);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['system-config', 'services'],
      });

      queryClient.invalidateQueries({
        queryKey: ['system-config', 'health'],
      });
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      data,
    }: {
      key: string;
      data: {
        value?: string;
        description?: string;
      };
    }) => {
      const res = await api.patch(`/system-config/settings/${key}`, data);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['system-config', 'settings'],
      });
    },
  });
}

export function useTestDevice() {
  return useMutation({
    mutationFn: async (key: string) => {
      const res = await api.get(`/system-config/health/devices/${key}`);

      return res.data as HealthItem;
    },
  });
}

export function useTestService() {
  return useMutation({
    mutationFn: async (key: string) => {
      const res = await api.get(`/system-config/health/services/${key}`);

      return res.data as HealthItem;
    },
  });
}
