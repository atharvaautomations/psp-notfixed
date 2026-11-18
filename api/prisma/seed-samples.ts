import { PrismaClient, ExecutionMode, ExecutionStatus, RecipeWorkflow, StepType, RecipeStepBatchType, MasterBatchStatus, FinalBatchStatus, BatchExecutionStatus, BatchProcessStatus, MixingExecutionStatus, IngredientExecutionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample data...');

  // ============================================
  // 1. Create/Find Ingredients
  // ============================================
  const ingredients = await Promise.all([
    prisma.ingredient.upsert({
      where: { ingredientCode: 'NR' },
      update: {},
      create: { ingredientCode: 'NR', name: 'Natural Rubber', type: 'POLYMER', materialName: 'Natural Rubber' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'SBR' },
      update: {},
      create: { ingredientCode: 'SBR', name: 'Styrene Butadiene Rubber', type: 'POLYMER', materialName: 'SBR' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'CB' },
      update: {},
      create: { ingredientCode: 'CB', name: 'Carbon Black N330', type: 'FILLER', materialName: 'Carbon Black' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'OIL' },
      update: {},
      create: { ingredientCode: 'OIL', name: 'Process Oil', type: 'OIL', materialName: 'Process Oil' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'ZNO' },
      update: {},
      create: { ingredientCode: 'ZNO', name: 'Zinc Oxide', type: 'CHEMICAL', materialName: 'Zinc Oxide' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'STEARIC' },
      update: {},
      create: { ingredientCode: 'STEARIC', name: 'Stearic Acid', type: 'CHEMICAL', materialName: 'Stearic Acid' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'SULPHUR' },
      update: {},
      create: { ingredientCode: 'SULPHUR', name: 'Sulphur', type: 'CURATIVE', materialName: 'Sulphur' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'CBS' },
      update: {},
      create: { ingredientCode: 'CBS', name: 'CBS Accelerator', type: 'ACCELERATOR', materialName: 'CBS' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'TMTD' },
      update: {},
      create: { ingredientCode: 'TMTD', name: 'TMTD Accelerator', type: 'ACCELERATOR', materialName: 'TMTD' },
    }),
    prisma.ingredient.upsert({
      where: { ingredientCode: 'ANTIOX' },
      update: {},
      create: { ingredientCode: 'ANTIOX', name: 'Antioxidant 6PPD', type: 'CHEMICAL', materialName: 'Antioxidant' },
    }),
  ]);

  const [nr, sbr, cb, oil, zno, stearic, sulphur, cbs, tmtd, antiox] = ingredients;

  // ============================================
  // 2. Create Sample Recipes (3 recipes)
  // ============================================
  const recipes = [];

  // Recipe 1: SR001 - Master + Final Batch
  const recipe1 = await prisma.recipe.upsert({
    where: { recipeCode_version: { recipeCode: 'SR001', version: 1 } },
    update: {},
    create: {
      recipeCode: 'SR001',
      name: 'Steering Rack Compound SR001',
      description: 'Standard steering rack rubber compound',
      workflow: RecipeWorkflow.KNEADER_AND_MIXING,
      version: 1,
      masterBatchCompoundName: 'MB-SR001-MASTER',
      polymerName: 'NR/SBR Blend',
      finalBatchCompoundName: 'FB-SR001-FINAL',
      steps: {
        create: [
          // Kneader Step (Master Batch)
          {
            stepType: StepType.KNEADER,
            batchType: RecipeStepBatchType.MASTER_BATCH,
            sequenceNumber: 1,
            timerSeconds: 300,
            ingredients: {
              create: [
                { ingredientId: nr.id, quantity: 70, tolerance: 1, unit: 'KG' },
                { ingredientId: sbr.id, quantity: 30, tolerance: 1, unit: 'KG' },
                { ingredientId: cb.id, quantity: 50, tolerance: 1, unit: 'KG' },
                { ingredientId: oil.id, quantity: 5, tolerance: 0.5, unit: 'KG' },
                { ingredientId: zno.id, quantity: 3, tolerance: 0.2, unit: 'KG' },
                { ingredientId: stearic.id, quantity: 2, tolerance: 0.2, unit: 'KG' },
              ],
            },
          },
          // Mixing Step (Final Batch)
          {
            stepType: StepType.MIXING,
            batchType: RecipeStepBatchType.FINAL_BATCH,
            sequenceNumber: 1,
            timerSeconds: 180,
            ingredients: {
              create: [
                { ingredientId: sulphur.id, quantity: 1.5, tolerance: 0.1, unit: 'KG' },
                { ingredientId: cbs.id, quantity: 1.2, tolerance: 0.1, unit: 'KG' },
                { ingredientId: tmtd.id, quantity: 0.3, tolerance: 0.05, unit: 'KG' },
                { ingredientId: antiox.id, quantity: 1.0, tolerance: 0.1, unit: 'KG' },
              ],
            },
          },
        ],
      },
    },
    include: { steps: { include: { ingredients: true } } },
  });
  recipes.push(recipe1);

  // Recipe 2: SR002 - Different compound
  const recipe2 = await prisma.recipe.upsert({
    where: { recipeCode_version: { recipeCode: 'SR002', version: 1 } },
    update: {},
    create: {
      recipeCode: 'SR002',
      name: 'Bush Compound SR002',
      description: 'High resilience bush compound',
      workflow: RecipeWorkflow.KNEADER_AND_MIXING,
      version: 1,
      masterBatchCompoundName: 'MB-SR002-MASTER',
      polymerName: 'BR/NR Blend',
      finalBatchCompoundName: 'FB-SR002-FINAL',
      steps: {
        create: [
          {
            stepType: StepType.KNEADER,
            batchType: RecipeStepBatchType.MASTER_BATCH,
            sequenceNumber: 1,
            timerSeconds: 360,
            ingredients: {
              create: [
                { ingredientId: nr.id, quantity: 60, tolerance: 1, unit: 'KG' },
                { ingredientId: sbr.id, quantity: 40, tolerance: 1, unit: 'KG' },
                { ingredientId: cb.id, quantity: 60, tolerance: 1, unit: 'KG' },
                { ingredientId: oil.id, quantity: 8, tolerance: 0.5, unit: 'KG' },
                { ingredientId: zno.id, quantity: 4, tolerance: 0.2, unit: 'KG' },
                { ingredientId: stearic.id, quantity: 2.5, tolerance: 0.2, unit: 'KG' },
              ],
            },
          },
          {
            stepType: StepType.MIXING,
            batchType: RecipeStepBatchType.FINAL_BATCH,
            sequenceNumber: 1,
            timerSeconds: 210,
            ingredients: {
              create: [
                { ingredientId: sulphur.id, quantity: 1.8, tolerance: 0.1, unit: 'KG' },
                { ingredientId: cbs.id, quantity: 1.5, tolerance: 0.1, unit: 'KG' },
                { ingredientId: tmtd.id, quantity: 0.4, tolerance: 0.05, unit: 'KG' },
                { ingredientId: antiox.id, quantity: 1.2, tolerance: 0.1, unit: 'KG' },
              ],
            },
          },
        ],
      },
    },
    include: { steps: { include: { ingredients: true } } },
  });
  recipes.push(recipe2);

  // Recipe 3: SR003 - Simple mixing only
  const recipe3 = await prisma.recipe.upsert({
    where: { recipeCode_version: { recipeCode: 'SR003', version: 1 } },
    update: {},
    create: {
      recipeCode: 'SR003',
      name: 'Gasket Compound SR003',
      description: 'Low compression set gasket compound',
      workflow: RecipeWorkflow.MIXING_FINAL_BATCH,
      version: 1,
      masterBatchCompoundName: 'N/A',
      polymerName: 'EPDM',
      finalBatchCompoundName: 'FB-SR003-FINAL',
      steps: {
        create: [
          {
            stepType: StepType.MIXING,
            batchType: RecipeStepBatchType.FINAL_BATCH,
            sequenceNumber: 1,
            timerSeconds: 240,
            ingredients: {
              create: [
                { ingredientId: nr.id, quantity: 100, tolerance: 1, unit: 'KG' },
                { ingredientId: cb.id, quantity: 80, tolerance: 1, unit: 'KG' },
                { ingredientId: oil.id, quantity: 10, tolerance: 0.5, unit: 'KG' },
                { ingredientId: zno.id, quantity: 5, tolerance: 0.2, unit: 'KG' },
                { ingredientId: stearic.id, quantity: 3, tolerance: 0.2, unit: 'KG' },
                { ingredientId: sulphur.id, quantity: 2.0, tolerance: 0.1, unit: 'KG' },
                { ingredientId: cbs.id, quantity: 1.8, tolerance: 0.1, unit: 'KG' },
              ],
            },
          },
        ],
      },
    },
    include: { steps: { include: { ingredients: true } } },
  });
  recipes.push(recipe3);

  console.log(`✅ Created ${recipes.length} recipes`);

  // ============================================
  // 3. Create Executions for each recipe
  // ============================================
  const executions = [];

  for (const recipe of recipes) {
    const execMode = ExecutionMode.BULK;

    const executionCode = `EXE-${recipe.recipeCode}-${Date.now().toString().slice(-6)}`;
    
    const execution = await prisma.execution.create({
      data: {
        recipeId: recipe.id,
        recipeCode: recipe.recipeCode,
        recipeName: recipe.name,
        recipeVersion: recipe.version,
        executionCode,
        mode: execMode,
        totalBatches: 3,
        status: ExecutionStatus.COMPLETED,
        productionBatchNumber: `PB-${recipe.recipeCode}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`,
        masterBatchExpiringDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        finalBatchExpiringDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });
    executions.push(execution);

    // Create batches for this execution
    for (let batchNum = 1; batchNum <= 3; batchNum++) {
      const completedAt = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000) + (batchNum * 2 * 60 * 60 * 1000));

      const batch = await prisma.executionBatch.create({
        data: {
          executionId: execution.id,
          batchNumber: batchNum,
          status: BatchExecutionStatus.COMPLETED,
          mixingStatus: BatchProcessStatus.COMPLETED,
          startedAt: new Date(completedAt.getTime() - 4 * 60 * 60 * 1000),
          completedAt: completedAt,
        },
      });

      // Get recipe steps with ingredients
      const recipeSteps = await prisma.recipeStep.findMany({
        where: { recipeId: recipe.id },
        include: { ingredients: { include: { ingredient: true } } },
      });

      // Create Master Batch (for recipes with kneader)
      let masterBatchCompletedAt: Date | null = null;
      if (recipe.workflow === RecipeWorkflow.KNEADER_AND_MIXING) {
        masterBatchCompletedAt = new Date(completedAt.getTime() - 26 * 60 * 60 * 1000); // 26 hours before final
        
        const masterBatch = await prisma.masterBatch.create({
          data: {
            qrId: `MB-${execution.executionCode}-B${batchNum}`,
            executionBatchId: batch.id,
            recipeId: recipe.id,
            status: MasterBatchStatus.CONSUMED,
            consumedAt: masterBatchCompletedAt,
            createdAt: masterBatchCompletedAt,
          },
        });

        // Create/Update Mixing Execution for Master Batch (first creation)
        await prisma.mixingExecution.create({
          data: {
            executionBatchId: batch.id,
            currentBatchType: 'FINAL_BATCH',
            currentStageSequence: 1,
            recipeWritten: true,
            status: MixingExecutionStatus.COMPLETED,
            startedAt: new Date(masterBatchCompletedAt.getTime() - 4 * 60 * 60 * 1000),
            completedAt: masterBatchCompletedAt,
          },
        });
      } else {
        // For MIXING_FINAL_BATCH workflow, create initial MixingExecution
        await prisma.mixingExecution.create({
          data: {
            executionBatchId: batch.id,
            currentBatchType: 'FINAL_BATCH',
            currentStageSequence: 1,
            recipeWritten: true,
            status: MixingExecutionStatus.COMPLETED,
            startedAt: new Date(completedAt.getTime() - 4 * 60 * 60 * 1000),
            completedAt: completedAt,
          },
        });
      }

      // Create Final Batch
      const finalBatchCompletedAt = completedAt;
      const shift = finalBatchCompletedAt.getHours() >= 8 && finalBatchCompletedAt.getHours() < 20 ? 'SHIFT 1' : 'SHIFT 2';
      
      const finalBatch = await prisma.finalBatch.create({
        data: {
          qrId: `FB-${execution.executionCode}-B${batchNum}`,
          executionBatchId: batch.id,
          recipeId: recipe.id,
          status: FinalBatchStatus.CREATED,
          mixingCompletedAt: finalBatchCompletedAt,
          shift: shift,
          expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          createdAt: finalBatchCompletedAt,
        },
      });

      // Create Execution Ingredients for weighing
      let plcIndex = 1;
      for (const step of recipeSteps) {
        for (const stepIng of step.ingredients) {
          await prisma.executionIngredient.create({
            data: {
              executionBatchId: batch.id,
              recipeStepId: step.id,
              stepIngredientId: stepIng.id,
              ingredientId: stepIng.ingredientId,
              ingredientCode: stepIng.ingredient.ingredientCode,
              ingredientName: stepIng.ingredient.name,
              ingredientType: stepIng.ingredient.type,
              materialName: stepIng.ingredient.materialName,
              stepSequence: step.sequenceNumber,
              stepType: step.stepType,
              batchType: step.batchType,
              timerSeconds: step.timerSeconds,
              plcIngredientIndex: plcIndex++,
              expectedQuantity: stepIng.quantity,
              tolerance: stepIng.tolerance,
              unit: stepIng.unit,
              actualQuantity: stepIng.quantity,
              status: IngredientExecutionStatus.CONSUMED,
              mixingScanned: true,
              qrId: `EI-${execution.executionCode}-B${batchNum}-${stepIng.ingredient.ingredientCode}`,
            },
          });
        }
      }
    }
  }

  console.log(`✅ Created ${executions.length} executions with 3 batches each`);
  console.log('📋 Execution Codes:', executions.map(e => e.executionCode).join(', '));

  console.log('\n🎉 Sample data seeding complete!');
  console.log('\nYou can now:');
  console.log('1. Go to /weighing to see executions');
  console.log('2. Print Final Batch labels from the execution table');
  console.log('3. Test Master-to-Final 24hr restriction by scanning Master Batch QR');
  console.log('4. Check schedules at /schedules');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });