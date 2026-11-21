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
import { Checkbox } from '@/components/ui/checkbox';

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
  // 'all' = delete all versions, number = delete specific version id, null = not set
  const [deleteTarget, setDeleteTarget] = useState<'all' | number | null>(
    null
  );

  const { data: recipes = [], isLoading } = useQuery<RecipeDetails[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await api.get('/recipes');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Fetch versions for the recipe pending delete
  const { data: versions = [] } = useQuery<RecipeDetails[]>({
    queryKey: ['recipe-delete-versions', pendingDelete?.recipeCode],
    queryFn: async () => {
      if (!pendingDelete?.recipeCode) return [];
      const res = await api.get(
        `/recipes/${encodeURIComponent(pendingDelete.recipeCode)}/versions`
      );
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(pendingDelete?.recipeCode),
    staleTime: 30_000,
  });

  const deleteRecipe = useMutation({
    mutationFn: async ({ id, version }: { id: number; version?: number }) => {
      const params = new URLSearchParams();
      if (version) params.set('version', String(version));
      const queryString = params.toString();
      const url = `/recipes/${id}${queryString ? '?' + queryString : ''}`;
      return api.delete(url);
    },

    onSuccess: () => {
      toast({
        title: 'Recipe moved to recycle bin',
        description:
          'Use the Recycle Bin to restore it or delete it permanently.',
      });

      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe-recycle-bin'] });
      qc.invalidateQueries({ queryKey: ['recipe-delete-versions'] });
      setPendingDelete(null);
      setDeleteTarget(null);
    },

    onError: (err: any) => {
      toast({
        title: 'Error deleting recipe',
        description: err.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
      setPendingDelete(null);
      setDeleteTarget(null);
    },
  });

  const handleDelete = (recipe: RecipeDetails) => {
    setPendingDelete(recipe);
    // Default to deleting the clicked version
    setDeleteTarget(recipe.id);
  };

  if (isLoading) {
    return <div className="p-6 text-gray-600">Loading recipes...</div>;
  }

  if (!recipes.length) {
    return <div className="p-6 text-gray-600">No recipes found.</div>;
  }

  const hasMultipleVersions = versions.length > 1;

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
            ? `Recipe ${pendingDelete.recipeCode}${
                hasMultipleVersions
                  ? ` — select the version to delete below, or choose "Delete All Versions"`
                  : ` (v${pendingDelete.version})`
              } can be restored from the Recycle Bin later.`
            : undefined
        }
        confirmLabel="Move to Recycle Bin"
        destructive
        busy={deleteRecipe.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;

          if (deleteTarget === 'all') {
            // Delete all versions — no version param
            deleteRecipe.mutate({ id: pendingDelete.id });
          } else if (typeof deleteTarget === 'number') {
            // Delete specific version — find its version number
            const versionToDelete = versions.find((v) => v.id === deleteTarget);
            deleteRecipe.mutate({
              id: deleteTarget,
              version: versionToDelete?.version,
            });
          } else {
            // Fallback: delete the pending delete record
            deleteRecipe.mutate({ id: pendingDelete.id });
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setDeleteTarget(null);
          }
        }}
      >
        {hasMultipleVersions && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3 mb-3">
              <Checkbox
                checked={deleteTarget === 'all'}
                onCheckedChange={(checked) =>
                  setDeleteTarget(checked ? 'all' : pendingDelete?.id ?? null)
                }
              />
              <label className="text-sm font-medium cursor-pointer">
                Delete All Versions
              </label>
            </div>

            {deleteTarget !== 'all' && versions.length > 0 && (
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Select Version to Delete
                </label>
                <select
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={deleteTarget ?? pendingDelete?.id}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setDeleteTarget(id);
                  }}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}