'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

export type UserRole =
  | 'STORES'
  | 'RUBBER_TECHNOLOGIST'
  | 'OPERATOR'
  | 'QUALITY_CONTROL';

export type UserRecord = {
  id: number;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  username: string;
  name: string;
  password: string;
  role: UserRole;
};

export function useUsers() {
  return useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await api.post('/users', payload);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['users'],
      });
    },
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await api.patch(`/users/${id}/active`, {
        isActive,
      });

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['users'],
      });
    },
  });
}
