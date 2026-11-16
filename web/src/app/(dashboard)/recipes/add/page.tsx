'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCreateRecipe } from '@/hooks/useRecipes';

import { Header, PageContainer, Card } from '@/components/global';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import StepList from '@/app/(dashboard)/recipes/components/StepList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  RecipeDraft,
  RecipeStepDraft,
  RecipeWorkflow,
  StepIngredient,
  StepType,
} from '../types';

const uid = () => Math.random().toString(36).slice(2, 9);

const emptyDraft: RecipeDraft = {
  recipeCode: '',
  name: '',
  description: '',
  workflow: 'KNEADER_AND_MIXING',
  steps: [],
};

function validateDraft(d: RecipeDraft) {
  const errs: string[] = [];
  if (!d.recipeCode.trim()) errs.push('Recipe code is required.');

  const relevant = d.steps;
  if (relevant.length === 0) errs.push('Add at least one step before saving.');

  for (const s of relevant) {
    if (s.sequenceNumber === '' || Number.isNaN(Number(s.sequenceNumber))) {
      errs.push(`Step "${s.stepType}" is missing a valid sequence number.`);
    }
    if (s.timerSeconds === '' || Number(s.timerSeconds) <= 0) {
      errs.push(`Step "${s.stepType}" must have timer > 0s.`);
    }
    if (!s.ingredients.length) {
      errs.push(
        `Step "${s.stepType}" (seq ${
          s.sequenceNumber || '—'
        }) has no ingredients.`
      );
    } else {
      const seen = new Set<string>();
      for (const ing of s.ingredients) {
        const ingredientKey = ing.name.trim().toLowerCase();
        if (ingredientKey && seen.has(ingredientKey)) {
          errs.push(
            `Step "${s.stepType}" contains duplicate ingredient "${ing.name}". Each ingredient can only be used once per step.`
          );
        }
        if (ingredientKey) seen.add(ingredientKey);
        if (!ing.name.trim()) errs.push('Each ingredient needs a code/name.');
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
  }
  return errs;
}

export default function RecipeAddPage() {
  const [stepIndex, setStepIndex] = useState<0 | 1 | 2 | 3>(0);
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft);
  const { mutateAsync: createRecipe, isPending } = useCreateRecipe();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recipeDraft');
      if (raw) {
        const parsed = JSON.parse(raw) as RecipeDraft;
        setDraft(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('recipeDraft', JSON.stringify(draft));
  }, [draft]);

  const kneaderSteps = useMemo(
    () => draft.steps.filter((s) => s.stepType === 'KNEADER'),
    [draft.steps]
  );
  const mixingSteps = useMemo(
    () => draft.steps.filter((s) => s.stepType === 'MIXING'),
    [draft.steps]
  );

  const handleWorkflowChange = (workflow: RecipeWorkflow) => {
    setDraft((prev) => ({
      ...prev,
      workflow,
      steps: prev.steps.map((step) => {
        switch (workflow) {
          case 'KNEADER_ONLY':
            return {
              ...step,
              batchType: 'FINAL_BATCH',
            };

          case 'KNEADER_AND_MIXING':
            return {
              ...step,
              batchType:
                step.stepType === 'KNEADER' ? 'MASTER_BATCH' : 'FINAL_BATCH',
            };

          case 'MIXING_FINAL_BATCH':
            return {
              ...step,
              batchType: 'FINAL_BATCH',
            };

          case 'MIXING_MASTER_AND_FINAL_BATCH':
            return step;
        }
      }),
    }));
  };

  const addStep = (stepType: StepType) => {
    setDraft((prev): RecipeDraft => {
      let nextSequence: number;

      if (prev.workflow === 'MIXING_MASTER_AND_FINAL_BATCH') {
        const batchType = 'FINAL_BATCH';

        nextSequence =
          prev.steps.filter(
            (s) => s.stepType === stepType && s.batchType === batchType
          ).length + 1;
      } else {
        nextSequence =
          prev.steps.filter((s) => s.stepType === stepType).length + 1;
      }

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

  const updateStep = (id: string, patch: Partial<RecipeStepDraft>) => {
    setDraft((prev): RecipeDraft => {
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
      }

      if (prev.workflow !== 'MIXING_MASTER_AND_FINAL_BATCH') {
        updatedSteps = [...updatedSteps].sort((a, b) => {
          if (a.stepType !== b.stepType) {
            return a.stepType.localeCompare(b.stepType);
          }

          return Number(a.sequenceNumber) - Number(b.sequenceNumber);
        });
      }

      return {
        ...prev,
        steps: updatedSteps,
      };
    });
  };

  const removeStep = (id: string) => {
    setDraft((prev): RecipeDraft => {
      let updatedSteps = prev.steps.filter((s) => s.id !== id);

      if (prev.workflow === 'MIXING_MASTER_AND_FINAL_BATCH') {
        let mb = 1;
        let fb = 1;

        updatedSteps = updatedSteps.map((step) => {
          if (step.stepType !== 'MIXING') {
            return step;
          }

          if (step.batchType === 'MASTER_BATCH') {
            return {
              ...step,
              sequenceNumber: mb++,
            };
          }

          return {
            ...step,
            sequenceNumber: fb++,
          };
        });
      } else {
        let kneader = 1;
        let mixing = 1;

        updatedSteps = updatedSteps.map((step) => {
          if (step.stepType === 'KNEADER') {
            return {
              ...step,
              sequenceNumber: kneader++,
            };
          }

          return {
            ...step,
            sequenceNumber: mixing++,
          };
        });
      }

      updatedSteps.sort((a, b) => {
        if (a.stepType !== b.stepType) {
          return 0;
        }

        if (a.batchType !== b.batchType) {
          return a.batchType === 'MASTER_BATCH' ? -1 : 1;
        }

        return Number(a.sequenceNumber) - Number(b.sequenceNumber);
      });

      return {
        ...prev,
        steps: updatedSteps,
      };
    });
  };

  const addIngredient = (stepId: string) => {
    setDraft(
      (prev): RecipeDraft => ({
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
      })
    );
  };

  const updateIngredient = (
    stepId: string,
    ingId: string,
    patch: Partial<StepIngredient>
  ) => {
    setDraft(
      (prev): RecipeDraft => ({
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
      })
    );
  };

  const removeIngredient = (stepId: string, ingId: string) => {
    setDraft(
      (prev): RecipeDraft => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId
            ? { ...s, ingredients: s.ingredients.filter((i) => i.id !== ingId) }
            : s
        ),
      })
    );
  };

  const goNext = () => {
    if (stepIndex === 0 && !draft.recipeCode.trim()) {
      toast({
        title: 'Missing recipe code',
        description: 'Enter a unique recipe code.',
        variant: 'destructive',
      });
      return;
    }

    setStepIndex((prev) => Math.min(3, prev + 1) as 0 | 1 | 2 | 3);
  };

  const goBack = () => {
    setStepIndex((prev) => Math.max(0, prev - 1) as 0 | 1 | 2 | 3);
  };

  const onSave = async () => {
    const errors = validateDraft(draft);
    if (errors.length) {
      toast({
        title: 'Please fix the following',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    const mixingSteps = draft.steps
      .filter((s) => s.stepType === 'MIXING')
      .sort((a, b) => {
        if (a.batchType !== b.batchType) {
          return a.batchType === 'MASTER_BATCH' ? -1 : 1;
        }

        return Number(a.sequenceNumber) - Number(b.sequenceNumber);
      });

    if (draft.workflow === 'MIXING_MASTER_AND_FINAL_BATCH') {
      let foundFinalBatch = false;

      for (const step of mixingSteps) {
        if (step.batchType === 'FINAL_BATCH') {
          foundFinalBatch = true;
        }

        if (foundFinalBatch && step.batchType === 'MASTER_BATCH') {
          toast({
            title: 'Invalid Batch Sequence',
            description:
              'Master Batch steps cannot appear after Final Batch steps.',
            variant: 'destructive',
          });

          return;
        }
      }
    }

    const payload = {
      recipeCode: draft.recipeCode.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      workflow: draft.workflow,

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
    };

    try {
      await createRecipe(payload);
      toast({
        title: 'Recipe Created',
        description: `Recipe ${draft.recipeCode} saved successfully.`,
      });
      setDraft(emptyDraft);
      localStorage.removeItem('recipeDraft');
      setStepIndex(0);
    } catch (err: unknown) {
      type ApiError = { response?: { data?: { message?: string } } };
      const error = err as ApiError;
      toast({
        title: 'Error Creating Recipe',
        description: error?.response?.data?.message || 'Failed to save recipe.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer>
      <Header
        title="Create Recipe"
        description="Build and configure production recipes"
        icon="📝"
      />

      <div className="mt-8">
        {/* Stepper */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <StepDot
              active={stepIndex === 0}
              done={stepIndex > 0}
              label="Basics"
            />
            <Dash />
            <StepDot
              active={stepIndex === 1}
              done={stepIndex > 1}
              label="Workflow"
            />
            <Dash />
            <StepDot
              active={stepIndex === 2}
              done={stepIndex > 2}
              label="Steps & Ingredients"
            />
            <Dash />
            <StepDot active={stepIndex === 3} done={false} label="Review" />
          </div>
        </Card>

        {/* Step 0: Basic Info */}
        {stepIndex === 0 && (
          <Card className="p-6 space-y-4">
            <div>
              <Label>Recipe Code</Label>
              <Input
                placeholder="e.g., SR01"
                value={draft.recipeCode}
                onChange={(e) =>
                  setDraft({ ...draft, recipeCode: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Recipe Name (optional)</Label>
              <Input
                placeholder="e.g., Steering Rack Compound"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                placeholder="Short description"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <FooterNav
              onBack={null}
              onNext={goNext}
              nextLabel="Next: Workflow"
            />
          </Card>
        )}

        {/* Step 1: Workflow */}
        {stepIndex === 1 && (
          <Card className="p-6 space-y-4">
            <Label>Recipe Workflow</Label>

            <Select
              value={draft.workflow}
              onValueChange={(value: RecipeWorkflow) =>
                handleWorkflowChange(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="KNEADER_ONLY">Kneader Only</SelectItem>

                <SelectItem value="KNEADER_AND_MIXING">
                  Kneader then Mixing
                </SelectItem>

                <SelectItem value="MIXING_FINAL_BATCH">
                  Mixing Only (Final Batch)
                </SelectItem>

                <SelectItem value="MIXING_MASTER_AND_FINAL_BATCH">
                  Mixing Only (Master Batch → Final Batch)
                </SelectItem>
              </SelectContent>
            </Select>

            <FooterNav
              onBack={goBack}
              onNext={goNext}
              nextLabel="Next: Steps"
            />
          </Card>
        )}

        {/* Step 2: Steps & Ingredients */}
        {stepIndex === 2 && (
          <div className="space-y-6">
            {(draft.workflow === 'KNEADER_ONLY' ||
              draft.workflow === 'KNEADER_AND_MIXING') && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Kneader Steps</h3>
                  <Button size="sm" onClick={() => addStep('KNEADER')}>
                    Add Kneader Step
                  </Button>
                </div>
                <StepList
                  workflow={draft.workflow}
                  steps={kneaderSteps}
                  onChange={updateStep}
                  onRemove={removeStep}
                  onAddIngredient={addIngredient}
                  onChangeIngredient={updateIngredient}
                  onRemoveIngredient={removeIngredient}
                />
              </Card>
            )}

            {(draft.workflow === 'KNEADER_AND_MIXING' ||
              draft.workflow === 'MIXING_FINAL_BATCH' ||
              draft.workflow === 'MIXING_MASTER_AND_FINAL_BATCH') && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Mixing Steps</h3>
                  <Button size="sm" onClick={() => addStep('MIXING')}>
                    Add Mixing Step
                  </Button>
                </div>
                <StepList
                  workflow={draft.workflow}
                  steps={mixingSteps}
                  onChange={updateStep}
                  onRemove={removeStep}
                  onAddIngredient={addIngredient}
                  onChangeIngredient={updateIngredient}
                  onRemoveIngredient={removeIngredient}
                />
              </Card>
            )}

            <FooterNav onBack={goBack} onNext={goNext} nextLabel="Review" />
          </div>
        )}

        {/* Step 3: Review */}
        {stepIndex === 3 && (
          <Card className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-lg">Summary</h3>
              <Separator className="my-3" />
              <div className="grid md:grid-cols-2 gap-4">
                <InfoRow label="Recipe Code" value={draft.recipeCode || '—'} />
                <InfoRow label="Name" value={draft.name || '—'} />
                <div className="md:col-span-2">
                  <InfoRow
                    label="Description"
                    value={draft.description || '—'}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Steps</h4>
              <Separator className="my-2" />
              {(['KNEADER', 'MIXING'] as StepType[]).map((t) => {
                const list = draft.steps.filter((s) => s.stepType === t);
                if (!list.length)
                  return (
                    <p key={t} className="text-sm text-gray-500 mb-3">
                      {t} — no steps
                    </p>
                  );
                return (
                  <div key={t} className="mb-4">
                    <div className="text-sm font-medium mb-1">{t}</div>
                    <div className="space-y-3">
                      {list
                        .slice()
                        .sort(
                          (a, b) =>
                            Number(a.sequenceNumber) - Number(b.sequenceNumber)
                        )
                        .map((s) => (
                          <Card key={s.id} className="p-3">
                            <div className="text-sm">
                              <div className="flex flex-wrap gap-4">
                                <span>
                                  <b>Seq:</b> {s.sequenceNumber || '—'}
                                </span>

                                <span>
                                  <b>Batch:</b>{' '}
                                  {s.batchType === 'MASTER_BATCH'
                                    ? 'MASTER BATCH'
                                    : s.batchType === 'FINAL_BATCH'
                                    ? 'FINAL BATCH'
                                    : s.batchType || '—'}
                                </span>

                                <span>
                                  <b>Timer:</b> {s.timerSeconds || '—'}s
                                </span>

                                <span>
                                  <b>Ingredients:</b> {s.ingredients.length}
                                </span>
                              </div>

                              <ul className="list-disc ml-6 mt-2">
                                {s.ingredients.map((i) => (
                                  <li key={i.id}>
                                    {i.name || '—'} — {i.quantity || '0'} GM (±
                                    {i.tolerance || '0'} GM)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(emptyDraft);
                    localStorage.removeItem('recipeDraft');
                    setStepIndex(0);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={onSave}
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isPending ? 'Saving...' : 'Save Recipe'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

// ---------- Small Components ----------
function StepDot({
  active,
  done,
  label,
}: Readonly<{
  active: boolean;
  done: boolean;
  label: string;
}>) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          'h-3 w-3 rounded-full',
          done ? 'bg-green-500' : active ? 'bg-blue-600' : 'bg-gray-300',
        ].join(' ')}
      />
      <span className={active ? 'text-blue-700 font-medium' : 'text-gray-600'}>
        {label}
      </span>
    </div>
  );
}

function Dash() {
  return <div className="flex-1 h-px bg-gray-200" />;
}

function FooterNav({
  onBack,
  onNext,
  nextLabel = 'Next',
}: Readonly<{
  onBack: null | (() => void);
  onNext: () => void;
  nextLabel?: string;
}>) {
  return (
    <div className="flex justify-between">
      <Button
        variant="outline"
        onClick={onBack ?? (() => undefined)}
        disabled={!onBack}
      >
        Back
      </Button>

      <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
        {nextLabel}
      </Button>
    </div>
  );
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
