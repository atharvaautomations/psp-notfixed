import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateRecipePayload } from '@/types/recipe';

type ApiError = { response?: { data?: { message?: string } } };

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRecipePayload) => {
      const res = await api.post('/recipes', data);
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: 'Recipe Created',
        description: 'The recipe has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (err: unknown) => {
      const error = err as ApiError;
      toast({
        title: 'Error Creating Recipe',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}
