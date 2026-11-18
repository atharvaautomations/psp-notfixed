'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

import { Header, PageContainer, Card } from '@/components/global';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import StepList from '../../components/StepList';
import type { RecipeDetails } from '../../components/RecipeDetailsModal';
import type {
  BatchType,
  RecipeDraft,
  RecipeStepDraft,
  RecipeWorkflow,
  StepIngredient,
  StepType,
  Unit,
} from '../../types';

const uid = () => Math.random().toString(36).slice(2, 9);

const WORKFLOW_LABELS: Record<RecipeWorkflow, string> = {
  KNEADER_ONLY: 'Kneader Only',
  KNEADER_AND_MIXING: 'Kneader then Mixing',
  MIXING_FINAL_BATCH: 'Mixing Only (Final Batch)',
  MIXING_MASTER_AND_FINAL_BATCH:
    'Mixing Only (Master Batch → Final Batch)',
};

function draftFromRecipe(recipe: RecipeDetails): RecipeDraft {
  return {
    recipeCode: recipe.recipeCode,
    name: recipe.name,
    description: recipe.description ?? '',
    workflow: recipe.workflow as RecipeWorkflow,
    masterBatchCompoundName: recipe.masterBatchCompoundName ?? '',
    polymerName: recipe.polymerName ?? '',
    finalBatchCompoundName: recipe.finalBatchCompoundName ?? '',
    steps: recipe.steps.map((s) => ({
      id: uid(),
      stepType: s.stepType as StepType,
      batchType: s.batchType as BatchType,
      sequenceNumber: s.sequenceNumber,
      timerSeconds: s.timerSeconds,
      ingredients: s.ingredients.map((i) => ({
        id: uid(),
        name: i.ingredient.ingredientCode,
        quantity: String(i.quantity),
        tolerance: String(i.tolerance),
        unit: i.unit as Unit,
      })),
    })),
  };
}

function validateDraft(d: RecipeDraft) {
  const errs: string[] = [];

  if (d.steps.length === 0) errs.push('Add at least one step before saving.');

  for (const s of d.steps) {
    const label = `${s.stepType} step ${
      s.sequenceNumber === '' ? '(no sequence)' : s.sequenceNumber
    }`;
    if (s.sequenceNumber === '' || Number.isNaN(Number(s.sequenceNumber))) {
      errs.push(`${label} is missing a valid sequence number.`);
    }
    if (s.timerSeconds === '' || Number(s.timerSeconds) <= 0) {
      errs.push(`${label} must have timer > 0s.`);
    }
    if (!s.ingredients.length) {
      errs.push(`${label} has no ingredients.`);
      continue;
    }

    const seen = new Set<string>();
    for (const ing of s.ingredients) {
      if (!ing.name.trim()) errs.push(`${label} has an empty ingredient.`);
      if (seen.has(ing.name)) {
        errs.push(
          `${label} contains duplicate ingredient "${ing.name}". Each ingredient can only be used once per step.`
        );
      }
      seen.add(ing.name);
      if (!ing.quantity || Number(ing.quantity) <= 0) {
        errs.push(
          `Ingredient "${ing.name || '(unnamed)'}" needs a quantity > 0.`
        );
      }
      if (ing.tolerance === '' || Number(ing.tolerance) < 0) {
        errs.push(
          `Ingredient "${
            ing.name || '(unnamed)'
          }" must have a valid tolerance.`
        );
      }
    }
  }

  return errs;
}

export default function RecipeEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const recipeId = Number(params.id);

  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  const {
    data: recipe,
    isLoading,
    isError,
  } = useQuery<RecipeDetails>({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const res = await api.get(`/recipes/${recipeId}`);
      return res.data;
    },
    enabled: Number.isFinite(recipeId),
  });

  const { data: versions = [] } = useQuery<RecipeDetails[]>({
    queryKey: ['recipe-versions', recipe?.recipeCode],
    queryFn: async () => {
      const res = await api.get(
        `/recipes/${encodeURIComponent(recipe!.recipeCode)}/versions`
      );
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!recipe?.recipeCode,
  });

  useEffect(() => {
    if (recipe) setDraft(draftFromRecipe(recipe));
  }, [recipe]);

  const latest = versions[0];
  const isLatest = !latest || latest.id === recipeId;

  const kneaderSteps =
    draft?.steps.filter((s) => s.stepType === 'KNEADER') ?? [];
  const mixingSteps =
    draft?.steps.filter((s) => s.stepType === 'MIXING') ?? [];

  const updateVersion = useMutation({
    mutationFn: async ({
      version,
      payload,
    }: {
      version: number;
      payload: unknown;
    }) => {
      return api.put(`/recipes/${recipeId}/version?version=${version}`, payload);
    },
    onSuccess: (_data, variables) => {
      toast({
        title: 'Recipe Updated',
        description: `Saved as version ${variables.version}. Older versions were left unchanged.`,
      });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe-versions'] });
      setVersionDialogOpen(false);
      router.push('/recipes');
    },
    onError: (err: any) => {
      toast({
        title: 'Error Creating Version',
        description:
          err?.response?.data?.message || 'Failed to save recipe version.',
        variant: 'destructive',
      });
    },
  });

  const updateStep = (id: string, patch: Partial<RecipeStepDraft>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      let updatedSteps = prev.steps.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      );

      if (prev.workflow === 'MIXING_MASTER_AND_FINAL_BATCH') {
        const mixingMaster = updatedSteps.filter(
          (s) => s.stepType === 'MIXING' && s.batchType === 'MASTER_BATCH'
        );
        const mixingFinal = updatedSteps.filter(
          (s) => s.stepType === 'MIXING' && s.batchType === 'FINAL_BATCH'
        );
        const others = updatedSteps.filter((s) => s.stepType !== 'MIXING');

        mixingMaster.forEach((s, i) => {
          s.sequenceNumber = i + 1;
        });
        mixingFinal.forEach((s, i) => {
          s.sequenceNumber = i + 1;
        });

        updatedSteps = [...others, ...mixingMaster, ...mixingFinal];
      } else {
        updatedSteps = [...updatedSteps].sort((a, b) => {
          if (a.stepType !== b.stepType) {
            return a.stepType.localeCompare(b.stepType);
          }
          return Number(a.sequenceNumber) - Number(b.sequenceNumber);
        });
      }

      return { ...prev, steps: updatedSteps };
    });
  };

  const addStep = (stepType: StepType) => {
    setDraft((prev) => {
      if (!prev) return prev;

      const nextSequence = prev.steps.filter(
        (s) => s.stepType === stepType
      ).length + 1;

      return {
        ...prev,
        steps: [
          ...prev.steps,
          {
            id: uid(),
            stepType,
            batchType:
              prev.workflow === 'KNEADER_AND_MIXING'
                ? stepType === 'KNEADER'
                  ? 'MASTER_BATCH'
                  : 'FINAL_BATCH'
                : 'FINAL_BATCH',
            sequenceNumber: nextSequence,
            timerSeconds: '',
            ingredients: [
              {
                id: uid(),
                name: '',
                quantity: '',
                tolerance: '',
                unit: 'KG',
              },
            ],
          },
        ],
      };
    });
  };

  const removeStep = (id: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      let updatedSteps = prev.steps.filter((s) => s.id !== id);

      if (prev.workflow === 'MIXING_MASTER_AND_FINAL_BATCH') {
        let mb = 1;
        let fb = 1;
        updatedSteps = updatedSteps.map((step) => {
          if (step.stepType !== 'MIXING') return step;
          if (step.batchType === 'MASTER_BATCH') {
            return { ...step, sequenceNumber: mb++ };
          }
          return { ...step, sequenceNumber: fb++ };
        });
      } else {
        let kneader = 1;
        let mixing = 1;
        updatedSteps = updatedSteps.map((step) => {
          if (step.stepType === 'KNEADER') {
            return { ...step, sequenceNumber: kneader++ };
          }
          return { ...step, sequenceNumber: mixing++ };
        });
      }

      updatedSteps.sort((a, b) => {
        if (a.stepType !== b.stepType) return 0;
        if (a.batchType !== b.batchType) {
          return a.batchType === 'MASTER_BATCH' ? -1 : 1;
        }
        return Number(a.sequenceNumber) - Number(b.sequenceNumber);
      });

      return { ...prev, steps: updatedSteps };
    });
  };

  const addIngredient = (stepId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    ingredients: [
                      ...s.ingredients,
                      {
                        id: uid(),
                        name: '',
                        quantity: '',
                        tolerance: '',
                        unit: 'KG',
                      },
                    ],
                  }
                : s
            ),
          }
        : prev
    );
  };

  const updateIngredient = (
    stepId: string,
    ingId: string,
    patch: Partial<StepIngredient>
  ) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    ingredients: s.ingredients.map((i) =>
                      i.id === ingId ? { ...i, ...patch } : i
                    ),
                  }
                : s
            ),
          }
        : prev
    );
  };

  const removeIngredient = (stepId: string, ingId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    ingredients: s.ingredients.filter((i) => i.id !== ingId),
                  }
                : s
            ),
          }
        : prev
    );
  };

  const openVersionDialog = () => {
    if (!draft) return;
    const errors = validateDraft(draft);
    if (errors.length) {
      toast({
        title: 'Please fix the following',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }
    setNewVersion(String((latest?.version ?? recipe?.version ?? 1) + 1));
    setVersionDialogOpen(true);
  };

  const onSave = () => {
    if (!draft) return;
    const version = Number(newVersion);
    const errors = validateDraft(draft);
    if (errors.length) {
      toast({
        title: 'Please fix the following',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isInteger(version) || version < 1) {
      toast({
        title: 'Invalid version',
        description: 'Enter a whole number greater than 0.',
        variant: 'destructive',
      });
      return;
    }
    if (latest && version <= latest.version) {
      toast({
        title: 'Invalid version',
        description: `New version must be greater than the current latest version (${latest.version}).`,
        variant: 'destructive',
      });
      return;
    }

    updateVersion.mutate({
      version,
      payload: {
        recipeCode: draft.recipeCode,
        name: draft.name,
        description: draft.description,
        workflow: draft.workflow,
        masterBatchCompoundName: draft.masterBatchCompoundName,
        polymerName: draft.polymerName,
        finalBatchCompoundName: draft.finalBatchCompoundName,
        steps: draft.steps.map((s) => ({
          stepType: s.stepType,
          batchType: s.batchType,
          sequenceNumber: Number(s.sequenceNumber),
          timerSeconds: Number(s.timerSeconds),
          ingredients: s.ingredients.map((i) => ({
            ingredientCode: i.name.trim(),
            quantity: Number(i.quantity),
            tolerance: Number(i.tolerance),
            unit: i.unit,
          })),
        })),
      },
    });
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="p-6 text-gray-600">Loading recipe...</div>
      </PageContainer>
    );
  }

  if (isError || !recipe || !draft) {
    return (
      <PageContainer>
        <div className="p-6 text-red-600">Unable to load recipe.</div>
      </PageContainer>
    );
  }

  const workflow = draft.workflow;

  return (
    <PageContainer>
      <Header
        title={`Edit Recipe ${recipe.recipeCode}`}
        description="Basics and workflow are read-only. Editing steps saves a new version."
        icon="📝"
      />

      {!isLatest && latest && (
        <Card className="mt-6 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Only the latest version can be edited. Version {latest.version} is
            the latest.{' '}
            <Link
              className="font-medium underline"
              href={`/recipes/${latest.id}/edit`}
            >
              Edit latest version
            </Link>
          </p>
        </Card>
      )}

      <div className="mt-6 space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">Basics (read-only)</h3>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Recipe Code</Label>
              <Input value={draft.recipeCode} disabled className="mt-1" />
            </div>
            <div>
              <Label>Recipe Name</Label>
              <Input value={draft.name} disabled className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input value={draft.description} disabled className="mt-1" />
            </div>
            <div>
              <Label>Master Batch Compound Name</Label>
              <Input value={draft.masterBatchCompoundName} disabled className="mt-1" />
            </div>
            <div>
              <Label>Polymer Name</Label>
              <Input value={draft.polymerName} disabled className="mt-1" />
            </div>
            <div>
              <Label>Final Batch Compound Name</Label>
              <Input value={draft.finalBatchCompoundName} disabled className="mt-1" />
            </div>
            <div>
              <Label>Workflow (read-only)</Label>
              <Input
                value={WORKFLOW_LABELS[workflow] ?? workflow}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label>Current Version</Label>
              <Input value={recipe.version} disabled className="mt-1" />
            </div>
          </div>
        </Card>

        {(workflow === 'KNEADER_ONLY' ||
          workflow === 'KNEADER_AND_MIXING') && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Kneader Steps</h3>
              <Button size="sm" onClick={() => addStep('KNEADER')}>
                Add Kneader Step
              </Button>
            </div>
            <StepList
              workflow={workflow}
              steps={kneaderSteps}
              onChange={updateStep}
              onRemove={removeStep}
              onAddIngredient={addIngredient}
              onChangeIngredient={updateIngredient}
              onRemoveIngredient={removeIngredient}
            />
          </Card>
        )}

        {(workflow === 'KNEADER_AND_MIXING' ||
          workflow === 'MIXING_FINAL_BATCH' ||
          workflow === 'MIXING_MASTER_AND_FINAL_BATCH') && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Mixing Steps</h3>
              <Button size="sm" onClick={() => addStep('MIXING')}>
                Add Mixing Step
              </Button>
            </div>
            <StepList
              workflow={workflow}
              steps={mixingSteps}
              onChange={updateStep}
              onRemove={removeStep}
              onAddIngredient={addIngredient}
              onChangeIngredient={updateIngredient}
              onRemoveIngredient={removeIngredient}
            />
          </Card>
        )}

        <Card className="p-6 flex items-center justify-between">
          <Link href="/recipes">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={openVersionDialog}
            disabled={!isLatest}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save as New Version
          </Button>
        </Card>
      </div>

      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Current version {recipe.version} will remain unchanged. Enter the
              version number for this edit.
            </p>
            <div>
              <Label>New Version</Label>
              <Input
                type="number"
                min={(latest?.version ?? recipe.version) + 1}
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVersionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={updateVersion.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateVersion.isPending ? 'Saving...' : 'Save Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
