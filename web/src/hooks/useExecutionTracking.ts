import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type ProcessWorkflow =
  | 'KNEADER_ONLY'
  | 'KNEADER_AND_MIXING'
  | 'MIXING_FINAL_BATCH'
  | 'MIXING_MASTER_AND_FINAL_BATCH';

export interface ProcessTrackingItem {
  id: number;
  executionCode: string;
  recipeCode: string;
  recipeName: string;
  workflow: ProcessWorkflow;
  totalBatches: number;
  completedBatches: number;
  progress: number; // 0–100, integer
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export function useExecutionTracking() {
  return useQuery<ProcessTrackingItem[]>({
    queryKey: ['execution-tracking'],
    queryFn: async () => {
      const res = await api.get('/executions/tracking');
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}
