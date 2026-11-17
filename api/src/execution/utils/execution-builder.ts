import { generateBulkQrId } from '../../common/utils/code-generator';
import { IngredientExecutionStatus } from '@prisma/client';

export function buildExecutionIngredients(
  recipe: any,
  execution: any,
  batches: any[]
) {
  const rows: any[] = [];

  const masterBatchSteps = recipe.steps.filter(
    (step: any) => step.batchType === 'MASTER_BATCH'
  );

  const finalBatchSteps = recipe.steps.filter(
    (step: any) => step.batchType === 'FINAL_BATCH'
  );

  const hasMasterBatch = masterBatchSteps.length > 0;

  for (const batch of batches) {
    let plcIngredientIndex = 1;

    const executionSteps = hasMasterBatch
      ? [...masterBatchSteps, ...finalBatchSteps]
      : finalBatchSteps;

    for (const step of executionSteps) {
      for (const ingredient of step.ingredients) {
        rows.push({
          executionBatchId: batch.id,

          recipeStepId: step.id,
          stepIngredientId: ingredient.id,

          ingredientId: ingredient.ingredientId,

          ingredientCode: ingredient.ingredient.ingredientCode,
          ingredientName: ingredient.ingredient.name,
          ingredientType: ingredient.ingredient.type,
          materialName: ingredient.ingredient.materialName,

          stepSequence: step.sequenceNumber,
          stepType: step.stepType,
          batchType: step.batchType,

          timerSeconds: step.timerSeconds,

          qrId: generateBulkQrId(
            execution.executionCode,
            batch.batchNumber,
            plcIngredientIndex
          ),

          plcIngredientIndex,

          expectedQuantity: ingredient.quantity,
          tolerance: ingredient.tolerance,
          unit: ingredient.unit,

          status: IngredientExecutionStatus.PENDING,
        });

        plcIngredientIndex += 2;
      }
    }
  }

  return rows;
}
