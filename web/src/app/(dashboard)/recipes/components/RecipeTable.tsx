'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { Pencil, Trash2 } from 'lucide-react';
import RecipeDetailsModal, { RecipeDetails } from './RecipeDetailsModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function VersionSelect({
  recipe,
  onSelect,
}: Readonly<{
  recipe: RecipeDetails;
  onSelect: (recipe: RecipeDetails) => void;
}>) {
  const { data: versions = [] } = useQuery<RecipeDetails[]>({
    queryKey: ['recipe-versions', recipe.recipeCode],
    queryFn: async () => {
      const res = await api.get(
        `/recipes/${encodeURIComponent(recipe.recipeCode)}/versions`
      );
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 30_000,
  });

  const [selectedId, setSelectedId] = useState(recipe.id);

  useEffect(() => {
    if (versions.length > 0 && !versions.some((v) => v.id === selectedId)) {
      setSelectedId(versions[0].id);
    }
  }, [versions, selectedId]);

  return (
    <select
      className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
      value={selectedId}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const picked = versions.find((v) => v.id === Number(e.target.value));
        if (!picked) return;
        setSelectedId(picked.id);
        onSelect(picked);
      }}
      title="Select recipe version"
    >
      {versions.length === 0 ? (
        <option value={recipe.id}>v{recipe.version}</option>
      ) : (
        versions.map((v, index) => (
          <option key={v.id} value={v.id}>
            v{v.version}
            {index === 0 ? ' (Latest)' : ''}
          </option>
        ))
      )}
    </select>
  );
}

export default function RecipeTable() {
  const qc = useQueryClient();

  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetails | null>(
    null
  );
  const [pendingDelete, setPendingDelete] = useState<RecipeDetails | null>(
    null
  );

  const { data: recipes = [], isLoading } = useQuery<RecipeDetails[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await api.get('/recipes');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: (id: number) => api.delete(`/recipes/${id}`),

    onSuccess: () => {
      toast({
        title: 'Recipe moved to recycle bin',
        description:
          'Use the Recycle Bin to restore it or delete it permanently.',
      });

      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe-recycle-bin'] });
      setPendingDelete(null);
    },

    onError: (err: any) => {
      toast({
        title: 'Error deleting recipe',
        description: err.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
      setPendingDelete(null);
    },
  });

  const handleDelete = (recipe: RecipeDetails) => {
    setPendingDelete(recipe);
  };

  if (isLoading) {
    return <div className="p-6 text-gray-600">Loading recipes...</div>;
  }

  if (!recipes.length) {
    return <div className="p-6 text-gray-600">No recipes found.</div>;
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipe Code</TableHead>

              <TableHead>Recipe Name</TableHead>

              <TableHead>Version</TableHead>

              <TableHead>Created Date</TableHead>

              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {recipes.map((recipe) => (
              <TableRow
                key={recipe.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <TableCell className="font-medium">
                  {recipe.recipeCode}
                </TableCell>

                <TableCell>{recipe.name}</TableCell>

                <TableCell>
                  <VersionSelect recipe={recipe} onSelect={setSelectedRecipe} />
                </TableCell>

                <TableCell>
                  {new Date(recipe.createdAt).toLocaleDateString()}
                </TableCell>

                <TableCell
                  className="text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Link href={`/recipes/${recipe.id}/edit`}>
                      <Button size="icon" variant="ghost" title="Edit">
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(recipe)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedRecipe && (
        <RecipeDetailsModal
          recipe={selectedRecipe}
          loading={false}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Move recipe to recycle bin?"
        description={
          pendingDelete
            ? `Recipe ${pendingDelete.recipeCode} (v${pendingDelete.version}) can be restored from the Recycle Bin later.`
            : undefined
        }
        confirmLabel="Move to Recycle Bin"
        destructive
        busy={deleteRecipe.isPending}
        onConfirm={() => {
          if (pendingDelete) deleteRecipe.mutate(pendingDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </>
  );
}
