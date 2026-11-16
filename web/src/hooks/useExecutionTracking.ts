import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ExecutionItem } from '../app/(dashboard)/weighing/types/execution';

export function useExecutionTracking() {
  return useQuery<ExecutionItem[]>({
    queryKey: ['execution-tracking'],
    queryFn: async () => {
      const res = await api.get('/weighing/executions');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}
