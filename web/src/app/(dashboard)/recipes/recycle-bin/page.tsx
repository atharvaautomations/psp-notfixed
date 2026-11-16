'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Header, PageContainer, Card } from '@/components/global';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

interface DeletedRecipe {
  id: number;
  recipeCode: string;
  name: string;
  version: number;
  deletedAt: string | null;
}

export default function RecipeRecycleBinPage() {
  const qc = useQueryClient();
  const [pendingPermanent, setPendingPermanent] =
    useState<DeletedRecipe | null>(null);

  const { data: recipes = [], isLoading } = useQuery<DeletedRecipe[]>({
    queryKey: ['recipe-recycle-bin'],
    queryFn: async () => {
      const res = await api.get('/recipes/recycle-bin');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['recipes'] });
    qc.invalidateQueries({ queryKey: ['recipe-recycle-bin'] });
    qc.invalidateQueries({ queryKey: ['recipe-versions'] });
  };

  const restore = useMutation({
    mutationFn: (id: number) => api.post(`/recipes/${id}/restore`),
    onSuccess: () => {
      toast({ title: 'Recipe restored' });
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: 'Error restoring recipe',
        description: err?.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const permanentDelete = useMutation({
    mutationFn: (id: number) => api.post(`/recipes/${id}/permanent-delete`),
    onSuccess: () => {
      toast({ title: 'Recipe permanently deleted' });
      invalidate();
      setPendingPermanent(null);
    },
    onError: (err: any) => {
      toast({
        title: 'Error deleting recipe',
        description: err?.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
      setPendingPermanent(null);
    },
  });

  return (
    <PageContainer>
      <Header
        title="Recipe Recycle Bin"
        description="Restore deleted recipes or remove them permanently"
        icon="🗑️"
      />

      <div className="mt-6">
        <Link href="/recipes">
          <Button variant="outline">Back to Recipes</Button>
        </Link>
      </div>

      <Card className="mt-6 p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-gray-600">Loading recycle bin...</div>
        ) : recipes.length === 0 ? (
          <div className="p-6 text-gray-600">
            Recycle bin is empty. Deleted recipes will appear here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe Code</TableHead>
                <TableHead>Recipe Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">
                    {recipe.recipeCode}
                  </TableCell>
                  <TableCell>{recipe.name}</TableCell>
                  <TableCell>{recipe.version}</TableCell>
                  <TableCell>
                    {recipe.deletedAt
                      ? new Date(recipe.deletedAt).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restore.isPending}
                        onClick={() => restore.mutate(recipe.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={permanentDelete.isPending}
                        onClick={() => setPendingPermanent(recipe)}
                      >
                        Delete Permanently
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={pendingPermanent !== null}
        title="Permanently delete recipe?"
        description={
          pendingPermanent
            ? `Recipe ${pendingPermanent.recipeCode} (v${pendingPermanent.version}) will be permanently deleted. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete Permanently"
        destructive
        busy={permanentDelete.isPending}
        onConfirm={() => {
          if (pendingPermanent) permanentDelete.mutate(pendingPermanent.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingPermanent(null);
        }}
      />
    </PageContainer>
  );
}
