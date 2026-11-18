import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ExecutionStatus,
  BatchExecutionStatus,
  BatchProcessStatus,
  IngredientExecutionStatus,
  StepType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExecutionDto } from './dto/create-execution.dto';
import { generateExecutionCode } from '../common/utils/code-generator';
import { buildExecutionIngredients } from './utils/execution-builder';

@Injectable()
export class ExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExecutionDto) {
    return this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findUnique({
        where: {
          id: dto.recipeId,
        },
        include: {
          steps: {
            include: {
              ingredients: {
                include: {
                  ingredient: {
                    include: {
                      bins: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!recipe) {
        throw new NotFoundException('Recipe not found.');
      }

      const count = await tx.execution.count();

      const executionCode = generateExecutionCode(count + 1);

      const execution = await tx.execution.create({
        data: {
          recipeId: dto.recipeId,

          recipeCode: recipe.recipeCode,
          recipeName: recipe.name,
          recipeVersion: recipe.version,

          executionCode,
          mode: dto.mode,
          totalBatches: dto.totalBatches,
          status: ExecutionStatus.PENDING,
          productionBatchNumber: dto.productionBatchNumber,
          masterBatchExpiringDate: dto.masterBatchExpiringDate ? new Date(dto.masterBatchExpiringDate) : null,
          finalBatchExpiringDate: dto.finalBatchExpiringDate ? new Date(dto.finalBatchExpiringDate) : null,
        },
      });

      const batches = [];

      for (let i = 1; i <= dto.totalBatches; i++) {
        const batch = await tx.executionBatch.create({
          data: {
            executionId: execution.id,
            batchNumber: i,
            status: BatchExecutionStatus.PENDING,
            kneaderStatus: BatchProcessStatus.PENDING,
            mixingStatus: BatchProcessStatus.PENDING,
          },
        });

        if (recipe.steps.some((s) => s.stepType === 'KNEADER')) {
          await tx.kneaderExecution.create({
            data: {
              executionBatchId: batch.id,
              currentBatchType: recipe.steps.some(
                (s) => s.batchType === 'MASTER_BATCH'
              )
                ? 'MASTER_BATCH'
                : 'FINAL_BATCH',
            },
          });
        }

        if (
          recipe.steps.some((s) => s.stepType === 'MIXING') &&
          !recipe.steps.some((s) => s.stepType === 'KNEADER')
        ) {
          await tx.mixingExecution.create({
            data: {
              executionBatchId: batch.id,
              currentBatchType: recipe.steps.some(
                (s) => s.batchType === 'MASTER_BATCH'
              )
                ? 'MASTER_BATCH'
                : 'FINAL_BATCH',
            },
          });
        }

        batches.push(batch);
      }

      const executionIngredients = buildExecutionIngredients(
        recipe,
        execution,
        batches
      );

      await tx.executionIngredient.createMany({
        data: executionIngredients,
      });

      return {
        message: 'Execution created successfully.',

        execution: {
          id: execution.id,
          executionCode: execution.executionCode,
          recipeCode: recipe.recipeCode,
          recipeName: recipe.name,
          mode: execution.mode,
          totalBatches: execution.totalBatches,
          status: execution.status,
        },

        summary: {
          batchesCreated: batches.length,
          ingredientsCreated: executionIngredients.length,
        },
      };
    });
  }

  async findExecutionQrs(id: number) {
    const execution = await this.prisma.execution.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        executionCode: true,
        totalBatches: true,

        batches: {
          orderBy: {
            batchNumber: 'asc',
          },
          select: {
            id: true,
            batchNumber: true,

            ingredients: {
              orderBy: {
                plcIngredientIndex: 'asc',
              },
              select: {
                id: true,
                qrId: true,
                expectedQuantity: true,
                tolerance: true,

                ingredient: {
                  select: {
                    name: true,
                    ingredientCode: true,
                  },
                },
                recipeStep: {
                  select: {
                    stepType: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found.');
    }

    return {
      id: execution.id,
      executionCode: execution.executionCode,
      totalBatches: execution.totalBatches,

      batches: execution.batches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,

        ingredients: batch.ingredients.map((ingredient) => ({
          id: ingredient.id,
          qrId: ingredient.qrId,
          expectedQuantity: ingredient.expectedQuantity,
          tolerance: ingredient.tolerance,
          ingredientCode: ingredient.ingredient.ingredientCode,
          stepType: ingredient.recipeStep?.stepType ?? null,
        })),
      })),
    };
  }

  async getTracking(id: number) {
    const execution = await this.prisma.execution.findUnique({
      where: {
        id,
      },

      include: {
        recipe: {
          include: {
            steps: {
              include: {
                ingredients: true,
              },
              orderBy: {
                sequenceNumber: 'asc',
              },
            },
          },
        },

        batches: {
          orderBy: {
            batchNumber: 'asc',
          },

          include: {
            kneaderExecution: true,
            mixingExecution: true,
            masterBatch: true,
            finalBatch: true,

            ingredients: {
              orderBy: {
                plcIngredientIndex: 'asc',
              },
            },
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found.');
    }

    const totalBatches = execution.batches.length;

    const completedBatches = execution.batches.filter(
      (batch) => batch.status === BatchExecutionStatus.COMPLETED
    ).length;

    const overallProgress =
      totalBatches === 0
        ? 0
        : Math.round((completedBatches / totalBatches) * 100);

    return {
      id: execution.id,
      executionCode: execution.executionCode,

      recipeCode: execution.recipeCode,
      recipeName: execution.recipeName,

      workflow: execution.recipe.workflow,
      status: execution.status,

      totalBatches,
      completedBatches,
      overallProgress,

      batches: execution.batches.map((batch) => {
        /*
         * ---------------------------------------------------------
         * WEIGHING
         * ---------------------------------------------------------
         *
         * Weighing completion is based ONLY on actualQuantity.
         *
         * We deliberately do not use CONSUMED here because an
         * ingredient can already have moved into Kneader/Mixing
         * after weighing was completed.
         */
        const weighingIngredients = batch.ingredients.map((ingredient) => ({
          id: ingredient.id,

          ingredientCode: ingredient.ingredientCode,
          ingredientName: ingredient.ingredientName,

          expectedQuantity: ingredient.expectedQuantity,
          actualQuantity: ingredient.actualQuantity,

          weighed: ingredient.actualQuantity !== null,

          weighedAt: ingredient.weighedAt,
          completedAt: ingredient.completedAt,
        }));

        const weighedIngredients = weighingIngredients.filter(
          (ingredient) => ingredient.weighed
        ).length;

        const totalWeighingIngredients = weighingIngredients.length;

        const weighingProgress =
          totalWeighingIngredients === 0
            ? 0
            : Math.round((weighedIngredients / totalWeighingIngredients) * 100);

        let weighingStatus: 'PENDING' | 'RUNNING' | 'COMPLETED';

        if (
          totalWeighingIngredients > 0 &&
          weighedIngredients === totalWeighingIngredients
        ) {
          weighingStatus = 'COMPLETED';
        } else if (weighedIngredients > 0) {
          weighingStatus = 'RUNNING';
        } else {
          weighingStatus = 'PENDING';
        }

        /*
         * ---------------------------------------------------------
         * PROCESS SECTION BUILDER
         * ---------------------------------------------------------
         */

        const buildProcessSection = (
          batchType: 'MASTER_BATCH' | 'FINAL_BATCH'
        ) => {
          const relevantSteps = execution.recipe.steps.filter(
            (step) => step.batchType === batchType
          );

          if (relevantSteps.length === 0) {
            return null;
          }

          /*
           * A batch type belongs to whichever process its recipe
           * steps are configured for.
           *
           * This is display/tracking logic only.
           */
          const processType =
            relevantSteps.find((step) => step.stepType === 'KNEADER')
              ?.stepType ??
            relevantSteps.find((step) => step.stepType === 'MIXING')
              ?.stepType ??
            null;

          if (!processType) {
            return null;
          }

          const processSteps = relevantSteps
            .filter((step) => step.stepType === processType)
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

          const processIngredients = batch.ingredients.filter(
            (ingredient) =>
              ingredient.batchType === batchType &&
              ingredient.stepType === processType
          );

          /*
           * A process ingredient is shown completed once the
           * existing workflow has either:
           *
           * 1. scanned it in the relevant process, or
           * 2. marked it CONSUMED after stage completion.
           *
           * No state is changed here.
           */
          const ingredientRows = processIngredients.map((ingredient) => {
            const scanned =
              processType === 'KNEADER'
                ? ingredient.kneaderScanned
                : ingredient.mixingScanned;

            return {
              id: ingredient.id,

              ingredientCode: ingredient.ingredientCode,
              ingredientName: ingredient.ingredientName,

              stepSequence: ingredient.stepSequence,

              status: ingredient.status,

              scanned,

              completed:
                ingredient.status === IngredientExecutionStatus.CONSUMED ||
                scanned,
            };
          });

          /*
           * A sequence is completed only when every ingredient
           * belonging to that sequence has been CONSUMED by the
           * existing workflow.
           */
          const sequenceRows = processSteps.map((step) => {
            const stepIngredients = processIngredients.filter(
              (ingredient) => ingredient.recipeStepId === step.id
            );

            const consumedCount = stepIngredients.filter(
              (ingredient) =>
                ingredient.status === IngredientExecutionStatus.CONSUMED
            ).length;

            const completed =
              stepIngredients.length > 0 &&
              consumedCount === stepIngredients.length;

            return {
              sequenceNumber: step.sequenceNumber,
              timerSeconds: step.timerSeconds,
              completed,
            };
          });

          const completedSteps = sequenceRows.filter(
            (step) => step.completed
          ).length;

          const totalSteps = sequenceRows.length;

          const progress =
            totalSteps === 0
              ? 0
              : Math.round((completedSteps / totalSteps) * 100);

          let currentSequence: number | null = null;
          let recipeWritten = false;

          if (processType === 'KNEADER' && batch.kneaderExecution) {
            if (batch.kneaderExecution.currentBatchType === batchType) {
              currentSequence = batch.kneaderExecution.currentStepSequence;
            }

            recipeWritten = batch.kneaderExecution.recipeWritten;
          }

          if (processType === 'MIXING' && batch.mixingExecution) {
            if (batch.mixingExecution.currentBatchType === batchType) {
              currentSequence = batch.mixingExecution.currentStageSequence;
            }

            recipeWritten = batch.mixingExecution.recipeWritten;
          }

          /*
           * Status is derived only for tracking/display.
           *
           * We are NOT writing anything back to the DB here.
           */
          let status: 'PENDING' | 'RUNNING' | 'COMPLETED';

          if (totalSteps > 0 && completedSteps === totalSteps) {
            status = 'COMPLETED';
          } else {
            const anyStarted = ingredientRows.some(
              (ingredient) =>
                ingredient.scanned ||
                ingredient.status === IngredientExecutionStatus.CONSUMED
            );

            const currentlyActive =
              processType === 'KNEADER'
                ? batch.kneaderExecution?.currentBatchType === batchType &&
                  batch.kneaderStatus === BatchProcessStatus.RUNNING
                : batch.mixingExecution?.currentBatchType === batchType &&
                  batch.mixingStatus === BatchProcessStatus.RUNNING;

            status = anyStarted || currentlyActive ? 'RUNNING' : 'PENDING';
          }

          return {
            batchType,

            processType,

            status,

            currentSequence,

            completedSteps,
            totalSteps,
            progress,

            recipeWritten,

            sequences: sequenceRows,

            ingredients: ingredientRows,
          };
        };

        const masterBatch = buildProcessSection('MASTER_BATCH');
        const finalBatch = buildProcessSection('FINAL_BATCH');

        /*
         * Existing batch overview.
         * Kept because you said the batch-wise summary should remain.
         */
        let currentProcess: 'WEIGHING' | 'KNEADER' | 'MIXING' | 'COMPLETED';

        if (weighingStatus !== 'COMPLETED') {
          currentProcess = 'WEIGHING';
        } else if (batch.kneaderStatus !== BatchProcessStatus.COMPLETED) {
          const hasKneaderSteps = execution.recipe.steps.some(
            (step) => step.stepType === StepType.KNEADER
          );

          currentProcess = hasKneaderSteps ? 'KNEADER' : 'MIXING';
        } else if (batch.mixingStatus !== BatchProcessStatus.COMPLETED) {
          const hasMixingSteps = execution.recipe.steps.some(
            (step) => step.stepType === StepType.MIXING
          );

          currentProcess = hasMixingSteps ? 'MIXING' : 'COMPLETED';
        } else {
          currentProcess = 'COMPLETED';
        }

        return {
          id: batch.id,
          batchNumber: batch.batchNumber,

          status: batch.status,

          kneaderStatus: batch.kneaderStatus,
          mixingStatus: batch.mixingStatus,

          currentProcess,

          /*
           * NEW TRACKING SECTIONS
           */
          weighing: {
            status: weighingStatus,

            weighedIngredients,
            totalIngredients: totalWeighingIngredients,

            progress: weighingProgress,

            ingredients: weighingIngredients,
          },

          masterBatch,

          finalBatch,

          /*
           * QR values remain exactly the same data generated by
           * the existing workflow.
           */
          masterBatchQr: batch.masterBatch?.qrId ?? null,
          finalBatchQr: batch.finalBatch?.qrId ?? null,
        };
      }),
    };
  }

  async getTrackingList() {
    const executions = await this.prisma.execution.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        recipe: true,
        batches: true,
      },
    });

    return executions.map((execution) => {
      const completedBatches = execution.batches.filter(
        (batch) => batch.status === 'COMPLETED'
      ).length;

      const progress =
        execution.totalBatches === 0
          ? 0
          : Math.round((completedBatches / execution.totalBatches) * 100);

      return {
        id: execution.id,
        executionCode: execution.executionCode,

        recipeCode: execution.recipeCode,
        recipeName: execution.recipeName,

        workflow: execution.recipe.workflow,

        totalBatches: execution.totalBatches,
        completedBatches,

        progress,

        status: execution.status,

        createdAt: execution.createdAt,
      };
    });
  }
}
