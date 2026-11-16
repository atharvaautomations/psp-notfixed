'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useIngredients } from '@/hooks/useIngredients';
import type {
  BatchType,
  RecipeStepDraft,
  RecipeWorkflow,
  StepIngredient,
} from '../types';

interface StepListProps {
  workflow: RecipeWorkflow;
  steps: RecipeStepDraft[];
  onChange: (id: string, patch: Partial<RecipeStepDraft>) => void;
  onRemove: (id: string) => void;
  onAddIngredient: (stepId: string) => void;
  onChangeIngredient: (
    stepId: string,
    ingId: string,
    patch: Partial<StepIngredient>
  ) => void;
  onRemoveIngredient: (stepId: string, ingId: string) => void;
  disabled?: boolean;
}

export default function StepList({
  workflow,
  steps,
  onChange,
  onRemove,
  onAddIngredient,
  onChangeIngredient,
  onRemoveIngredient,
  disabled,
}: Readonly<StepListProps>) {
  const { data: ingredientOptions = [], isLoading: isLoadingIngredients } =
    useIngredients();

  if (!steps || !steps.length) {
    return <p className="text-sm text-gray-500">No steps added yet.</p>;
  }

  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <Card key={s.id} className="p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="col-span-2">
              <Label>Sequence No.</Label>
              <Input value={s.sequenceNumber} readOnly />
            </div>

            <div className="col-span-4">
              <Label>Batch Type</Label>

              <Select
                value={s.batchType}
                onValueChange={(value) =>
                  onChange(s.id, {
                    batchType: value as BatchType,
                  })
                }
                disabled={
                  disabled || workflow !== 'MIXING_MASTER_AND_FINAL_BATCH'
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="MASTER_BATCH">Master Batch</SelectItem>

                  <SelectItem value="FINAL_BATCH">Final Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Step Timer (sec)</Label>
              <Input
                type="number"
                min={1}
                value={s.timerSeconds ? String(s.timerSeconds) : ''}
                onChange={(e) =>
                  onChange(s.id, { timerSeconds: Number(e.target.value) })
                }
                disabled={disabled}
              />
            </div>

            <div className="col-span-4 flex items-end justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onAddIngredient(s.id)}
                disabled={disabled}
              >
                Add Ingredient
              </Button>
              <Button
                variant="destructive"
                onClick={() => onRemove(s.id)}
                disabled={disabled}
              >
                Remove Step
              </Button>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="text-sm text-gray-600 font-medium">Ingredients</div>
            <div className="space-y-2">
              {s.ingredients.map((ing, idx) => {
                // Collect ingredient codes already selected in this step
                const selectedInStep = new Set(
                  s.ingredients
                    .filter((_, i) => i !== idx)
                    .map((other) => other.name)
                    .filter(Boolean)
                );

                return (
                  <div key={ing.id} className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <Label className="sr-only">Ingredient Code</Label>
                      <Select
                        value={ing.name}
                        onValueChange={(v) =>
                          onChangeIngredient(s.id, ing.id, {
                            name: v as string,
                          })
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select Ingredient" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {isLoadingIngredients ? (
                            <SelectItem value="loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : ingredientOptions.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No ingredients found
                            </SelectItem>
                          ) : (
                            ingredientOptions
                              .filter(
                                (ingItem) =>
                                  !selectedInStep.has(
                                    ingItem.ingredientCode ?? ''
                                  )
                              )
                              .map((ingItem) => (
                                <SelectItem
                                  key={ingItem.id}
                                  value={ingItem.ingredientCode ?? ''}
                                >
                                  {ingItem.ingredientCode} — {ingItem.name || ''}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedInStep.size > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Ingredients already used in this step: {[
                            ...selectedInStep,
                          ].join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <Label className="sr-only">Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={ing.quantity ? String(ing.quantity) : ''}
                        onChange={(e) =>
                          onChangeIngredient(s.id, ing.id, {
                            quantity: e.target.value,
                          })
                        }
                        disabled={disabled}
                      />
                      <Label className="text-sm font-medium text-gray-700">
                        GM
                      </Label>
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <Label className="sr-only">Tolerance</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Tolerance"
                        value={ing.tolerance ? String(ing.tolerance) : ''}
                        onChange={(e) =>
                          onChangeIngredient(s.id, ing.id, {
                            tolerance: e.target.value,
                          })
                        }
                        disabled={disabled}
                      />
                      <Label className="text-sm font-medium text-gray-700">
                        GM
                      </Label>
                    </div>

                    <div className="col-span-2 flex items-center justify-end">
                      <Button
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => onRemoveIngredient(s.id, ing.id)}
                        disabled={disabled}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
