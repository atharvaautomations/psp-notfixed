import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating sample execution with completed dates...');

  // First, let's find existing recipes and ingredients
  const recipes = await prisma.recipe.findMany({
    include: {
      steps: {
        include: {
          ingredients: {
            include: { ingredient: true }
          }
        }
      }
    },
    take: 1
  });

  if (recipes.length === 0) {
    console.log('No recipes found. Please create a recipe first.');
    return;
  }

  const recipe = recipes[0];
  console.log('Using recipe:', recipe.recipeCode, '-', recipe.name);

  // Check if execution already exists
  const existingExecution = await prisma.execution.findFirst({
    where: { recipeId: recipe.id },
    include: { batches: true }
  });

  if (existingExecution) {
    console.log('Execution already exists:', existingExecution.executionCode);
    return;
  }

  // Create execution
  const executionCode = 'EXE-26324-0001';
  const totalBatches = 2;

  // Calculate expected quantities from recipe steps
  let allIngredients: any[] = [];
  for (const step of recipe.steps) {
    for (const stepIng of step.ingredients) {
      allIngredients.push({
        recipeStepId: step.id,
        stepIngredientId: stepIng.id,
        ingredientId: stepIng.ingredientId,
        ingredientCode: stepIng.ingredient?.ingredientCode || 'ING',
        ingredientName: stepIng.ingredient?.name || 'Ingredient',
        ingredientType: stepIng.ingredient?.type || 'RAW',
        materialName: stepIng.ingredient?.materialName || 'Material',
        stepSequence: step.sequenceNumber,
        stepType: step.stepType,
        batchType: step.batchType,
        timerSeconds: step.timerSeconds,
        expectedQuantity: stepIng.quantity,
        tolerance: stepIng.tolerance || 0,
        unit: stepIng.unit || 'KG',
        baseExpectedQuantity: stepIng.baseQuantity,
        baseTolerance: stepIng.baseTolerance,
        baseActualQuantity: null,
        baseUnit: stepIng.baseUnit,
        plcIngredientIndex: 0,
      });
    }
  }

  const execution = await prisma.execution.create({
    data: {
      executionCode,
      recipeId: recipe.id,
      recipeCode: recipe.recipeCode,
      recipeName: recipe.name,
      mode: 'AUTO',
      totalBatches,
      status: 'COMPLETED',
      workflow: recipe.workflow,
      createdAt: new Date('2024-11-20T08:00:00.000Z'),
      batches: {
        create: [
          {
            batchNumber: 1,
            status: 'COMPLETED',
            kneaderStatus: 'COMPLETED',
            mixingStatus: 'COMPLETED',
            startedAt: new Date('2024-11-20T08:30:00.000Z'),
            completedAt: new Date('2024-11-20T14:30:00.000Z'),
            ingredients: {
              create: allIngredients.map(ing => ({
                ...ing,
                expectedQuantity: ing.expectedQuantity * 1.0,
                actualQuantity: ing.expectedQuantity * 1.0 * 0.99,
                status: 'COMPLETED',
                weighedAt: new Date('2024-11-20T09:00:00.000Z'),
                completedAt: new Date('2024-11-20T10:00:00.000Z'),
                weighed: true,
                weighedAt: new Date('2024-11-20T09:00:00.000Z'),
                kneaderScanned: true,
                mixingScanned: true,
              })
            },
            kneaderExecution: {
              create: {
                currentBatchType: 'MASTER_BATCH',
                currentStepSequence: 2,
                recipeWritten: true,
                status: 'COMPLETED',
                createdAt: new Date('2024-11-20T10:30:00.000Z'),
                completedAt: new Date('2024-11-20T12:00:00.000Z'),
              }
            },
            mixingExecution: {
              create: {
                currentBatchType: 'FINAL_BATCH',
                currentStageSequence: 3,
                recipeWritten: true,
                status: 'COMPLETED',
                startedAt: new Date('2024-11-20T12:30:00.000Z'),
                completedAt: new Date('2024-11-20T14:00:00.000Z'),
              }
            },
            finalBatch: {
              create: {
                qrId: 'FB-EXE-26324-0001-B1',
                recipeId: recipe.id,
                executionBatchId: 0,
                status: 'CREATED',
                mixingCompletedAt: new Date('2024-11-20T14:00:00.000Z'),
                shift: 'SHIFT 1',
                expiryDate: new Date('2025-11-20'),
              }
            },
            masterBatch: {
              create: {
                qrId: 'MB-EXE-26324-0001-B1',
                recipeId: recipe.id,
                executionBatchId: 0,
                status: 'CREATED',
              }
            }
          },
          {
            batchNumber: 2,
            status: 'COMPLETED',
            kneaderStatus: 'COMPLETED',
            mixingStatus: 'COMPLETED',
            startedAt: new Date('2024-11-20T15:00:00.000Z'),
            completedAt: new Date('2024-11-20T21:00:00.000Z'),
            ingredients: {
              create: allIngredients.map(ing => ({
                ...ing,
                expectedQuantity: ing.expectedQuantity * 1.0,
                actualQuantity: ing.expectedQuantity * 1.0 * 0.98,
                status: 'COMPLETED',
                weighedAt: new Date('2024-11-20T15:30:00.000Z'),
                completedAt: new Date('2024-11-20T16:30:00.000Z'),
                weighed: true,
                weighedAt: new Date('2024-11-20T15:30:00.000Z'),
                kneaderScanned: true,
                mixingScanned: true,
              })
            },
            kneaderExecution: {
              create: {
                currentBatchType: 'FINAL_BATCH',
                currentStepSequence: 2,
                recipeWritten: true,
                status: 'COMPLETED',
                createdAt: new Date('2024-11-20T17:00:00.000Z'),
                completedAt: new Date('2024-11-20T19:00:00.000Z'),
              }
            },
            mixingExecution: {
              create: {
                currentBatchType: 'FINAL_BATCH',
                currentStageSequence: 3,
                recipeWritten: true,
                status: 'COMPLETED',
                startedAt: new Date('2024-11-20T19:30:00.000Z'),
                completedAt: new Date('2024-11-20T20:30:00.000Z'),
              }
            },
            finalBatch: {
              create: {
                qrId: 'FB-EXE-26324-0001-B2',
                recipeId: recipe.id,
                executionBatchId: 0,
                status: 'CREATED',
                mixingCompletedAt: new Date('2024-11-20T20:30:00.000Z'),
                shift: 'SHIFT 2',
                expiryDate: new Date('2025-11-20'),
              }
            },
            masterBatch: {
              create: {
                qrId: 'MB-EXE-26324-0001-B2',
                recipeId: recipe.id,
                executionBatchId: 0,
                status: 'CREATED',
              }
            }
          }
        ]
      }
    });

    console.log('Created execution:', execution.executionCode);
    console.log('Execution ID:', execution.id);
    console.log('Batches created:', execution.batches.length);
    
    // Update finalBatch and masterBatch with correct executionBatchId
    const batches = await prisma.executionBatch.findMany({
      where: { executionId: execution.id },
      include: { finalBatch: true, masterBatch: true }
    });

    for (const batch of batches) {
      if (batch.finalBatch) {
        await prisma.finalBatch.update({
          where: { id: batch.finalBatch.id },
          data: { executionBatchId: batch.id }
        });
      }
      if (batch.masterBatch) {
        await prisma.masterBatch.update({
          where: { id: batch.masterBatch.id },
          data: { executionBatchId: batch.id }
        });
      }
    }

    console.log('Updated finalBatch and masterBatch with correct executionBatchId');
    console.log('Done! Sample execution created with completed dates.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});