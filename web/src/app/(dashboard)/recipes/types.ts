export type Unit = 'KG' | 'L' | 'G' | 'ML';
export type StepType = 'KNEADER' | 'MIXING';
export type BatchType = 'MASTER_BATCH' | 'FINAL_BATCH';

export type RecipeWorkflow =
  | 'KNEADER_ONLY'
  | 'KNEADER_AND_MIXING'
  | 'MIXING_FINAL_BATCH'
  | 'MIXING_MASTER_AND_FINAL_BATCH';

export interface StepIngredient {
  id: string;
  name: string;
  quantity: string;
  tolerance: string;
  unit: Unit;
}

export interface RecipeStepDraft {
  id: string;
  stepType: StepType;
  batchType: BatchType;
  sequenceNumber: number | '';
  timerSeconds: number | '';
  ingredients: StepIngredient[];
}

export interface RecipeDraft {
  recipeCode: string;
  name: string;
  description: string;
  workflow: RecipeWorkflow;
  masterBatchCompoundName: string;
  polymerName: string;
  finalBatchCompoundName: string;
  steps: RecipeStepDraft[];
}

export interface RecipeCreatePayload {
  recipeCode: string;
  name: string;
  description: string;
  workflow: RecipeWorkflow;
  masterBatchCompoundName: string;
  polymerName: string;
  finalBatchCompoundName: string;
  steps: {
    stepType: StepType;
    batchType: BatchType;
    sequenceNumber: number;
    timerSeconds: number;
    ingredients: {
      ingredientCode: string;
      quantity: number;
      tolerance: number;
      unit: Unit;
    }[];
  }[];
}
