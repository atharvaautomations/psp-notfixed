'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecipeOption } from '../types/execution';
import { ExecutionPreview } from './ExecutionPreview';

interface RecipeVersionRow {
  id: number;
  recipeCode: string;
  name: string;
  version: number;
  steps: {
    ingredients: {
      quantity: number;
      ingredient?: { ingredientCode?: string; name?: string };
    }[];
  }[];
}

interface ExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: RecipeOption[];
  selectedRecipeId: string;
  selectedVersionId: string;
  batchCount: number;
  recipeError?: string;
  versionError?: string;
  batchError?: string;
  onRecipeChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onBatchCountChange: (value: string) => void;
  onSubmit: () => void;
}

export function ExecutionDialog({
  open,
  onOpenChange,
  recipes,
  selectedRecipeId,
  selectedVersionId,
  batchCount,
  recipeError,
  versionError,
  batchError,
  onRecipeChange,
  onVersionChange,
  onBatchCountChange,
  onSubmit,
}: ExecutionDialogProps) {
  const [versions, setVersions] = useState<RecipeVersionRow[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;

  // Versions are returned newest-first, so the first row is the latest one.
  useEffect(() => {
    if (!selectedRecipe?.recipeCode) {
      setVersions([]);
      setLoadingVersions(false);
      return;
    }

    let cancelled = false;
    setLoadingVersions(true);
    api
      .get(`/recipes/${encodeURIComponent(selectedRecipe.recipeCode)}/versions`)
      .then((res) => {
        if (cancelled) return;
        const data: RecipeVersionRow[] = Array.isArray(res.data)
          ? res.data
          : [];
        setVersions(data);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVersions(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally re-run only when the recipe code changes; re-running on
    // selectedVersionId would loop through onVersionChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecipe?.recipeCode]);

  const selectedVersionRow =
    versions.find((row) => String(row.id) === selectedVersionId) ?? null;

  // Default to the latest version (first row) whenever the current selection
  // is empty or no longer part of the loaded version list.
  useEffect(() => {
    if (
      versions.length > 0 &&
      !versions.some((row) => String(row.id) === selectedVersionId)
    ) {
      onVersionChange(String(versions[0].id));
    }
  }, [versions, selectedVersionId, onVersionChange]);

  const effectiveVersionId =
    selectedVersionId || (versions[0] ? String(versions[0].id) : '');

  const previewRecipe = useMemo<RecipeOption | null>(() => {
    if (!selectedVersionRow) return selectedRecipe;
    return {
      id: String(selectedVersionRow.id),
      recipeCode: selectedVersionRow.recipeCode,
      name: selectedVersionRow.name,
      ingredients: selectedVersionRow.steps.flatMap((step) =>
        step.ingredients.map((item) => ({
          ingredientCode:
            item.ingredient?.name || item.ingredient?.ingredientCode || '',
          quantity: item.quantity,
        }))
      ),
    };
  }, [selectedVersionRow, selectedRecipe]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white max-h-[calc(100vh-6rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Execution</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Recipe
              </label>
              <Select value={selectedRecipeId} onValueChange={onRecipeChange}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select recipe" />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recipeError ? (
                <p className="text-sm text-red-600">{recipeError}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Version
              </label>
              {loadingVersions ? (
                <Select value="" disabled>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Loading..." />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              ) : versions.length === 0 ? (
                <Select value="" disabled>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="No versions" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              ) : (
                <Select
                  value={effectiveVersionId}
                  onValueChange={onVersionChange}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v, index) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.version}
                        {index === 0 ? ' (Latest)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {versionError ? (
                <p className="text-sm text-red-600">{versionError}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Number Of Batches
              </label>
              <Input
                type="number"
                min="1"
                value={batchCount}
                onChange={(event) => onBatchCountChange(event.target.value)}
                placeholder="Enter batch count"
              />
              {batchError ? (
                <p className="text-sm text-red-600">{batchError}</p>
              ) : null}
            </div>
          </div>

          <ExecutionPreview recipe={previewRecipe} batchCount={batchCount} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Execution</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
