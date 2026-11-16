import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'NOT_CONFIGURED';

export interface SystemDeviceStatus {
  name: string;
  type: 'PLC' | 'HMI' | 'PC' | 'PRINTER';
  ip: string;
  port?: number;
  status: DeviceStatus;
}

export interface SystemStatusResponse {
  success: boolean;
  checkedAt: string;
  plcServiceOnline: boolean;
  devices: SystemDeviceStatus[];
}

export function useSystemStatus() {
  return useQuery<SystemStatusResponse>({
    queryKey: ['system-status'],

    queryFn: async () => {
      const response = await api.get('/system-status');

      return response.data;
    },

    // Don't continuously poll.
    // Status will update when user clicks Refresh.
    refetchOnWindowFocus: false,
  });
}
