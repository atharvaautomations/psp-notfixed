'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/inward/materials');
        return data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/inward/suppliers');
        return data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
