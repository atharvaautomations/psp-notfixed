'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RecipeIngredient {
  id: number;
  ingredientId: number;
  quantity: number;
  tolerance: number;
  unit: string;
  ingredient: {
    id: number;
    ingredientCode: string;
    name: string;
    type: string;
    customType?: string | null;
    materialName: string;
  };
}

interface RecipeStep {
  id: number;
  stepType: string;
  batchType: string;
  sequenceNumber: number;
  timerSeconds: number;
  ingredients: RecipeIngredient[];
}

export interface RecipeDetails {
  id: number;
  recipeCode: string;
  name: string;
  description?: string | null;
  workflow: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  masterBatchCompoundName?: string | null;
  polymerName?: string | null;
  finalBatchCompoundName?: string | null;
  steps: RecipeStep[];
}

interface RecipeDetailsModalProps {
  recipe: RecipeDetails | undefined;
  loading: boolean;
  onClose: () => void;
}

export default function RecipeDetailsModal({
  recipe,
  loading,
  onClose,
}: RecipeDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {loading ? 'Recipe Details' : recipe?.name}
            </h2>

            {recipe && (
              <p className="text-sm text-gray-500 mt-1">{recipe.recipeCode}</p>
            )}
          </div>

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600">
            Loading recipe details...
          </div>
        ) : recipe ? (
          <div className="p-6 space-y-6">
            {/* Basic Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Recipe Code</p>
                <p className="font-semibold mt-1">{recipe.recipeCode}</p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Recipe Name</p>
                <p className="font-semibold mt-1">{recipe.name}</p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Workflow</p>
                <p className="font-semibold mt-1">{recipe.workflow}</p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Version</p>
                <p className="font-semibold mt-1">{recipe.version}</p>
              </div>
            </div>

            {/* Description */}
            {recipe.description && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Description</p>

                <p className="mt-1 text-gray-900">{recipe.description}</p>
              </div>
            )}

            {/* Steps */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recipe Steps
              </h3>

              <div className="space-y-5">
                {recipe.steps
                  .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                  .map((step) => (
                    <div
                      key={step.id}
                      className="rounded-lg border border-gray-200 overflow-hidden"
                    >
                      {/* Step Header */}
                      <div className="bg-gray-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Step {step.sequenceNumber}
                          </p>

                          <p className="text-sm text-gray-600 mt-1">
                            {step.stepType}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            {step.batchType}
                          </span>

                          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700">
                            {step.timerSeconds}s
                          </span>
                        </div>
                      </div>

                      {/* Ingredients */}
                      <div className="p-4 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingredient Code</TableHead>

                              <TableHead>Ingredient Name</TableHead>

                              <TableHead>Type</TableHead>

                              <TableHead>Quantity (GM)</TableHead>

                              <TableHead>Tolerance (GM)</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {step.ingredients.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {item.ingredient.ingredientCode}
                                </TableCell>

                                <TableCell>{item.ingredient.name}</TableCell>

                                <TableCell>
                                  {item.ingredient.type === 'OTHER'
                                    ? item.ingredient.customType || 'Other'
                                    : item.ingredient.type}
                                </TableCell>

                                <TableCell>{item.quantity}</TableCell>

                                <TableCell>{item.tolerance}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-red-500">
            Unable to load recipe details.
          </div>
        )}
      </div>
    </div>
  );
}
