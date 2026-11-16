import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Ingredient } from '@/types/ingredients';

export function useIngredients() {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const res = await api.get('/ingredients');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}
