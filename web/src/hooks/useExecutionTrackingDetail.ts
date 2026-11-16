import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useExecutionTrackingDetail(id: number) {
  return useQuery({
    queryKey: ['execution-tracking', id],
    queryFn: async () => {
      const response = await api.get(`/executions/${id}/tracking`);
      return response.data || {};
    },
    enabled: !!id,
    refetchInterval: 3000,
  });
}
