import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IngredientExecutionStatus,
  Prisma,
  KneaderExecutionStatus,
  BatchProcessStatus,
  BatchExecutionStatus,
  ExecutionStatus,
  RecipeStep,
  StepType,
  RecipeStepBatchType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteStageDto, ScanKneaderDto } from './dto/scan-kneader.dto';
import { RecipeWrittenDto } from './dto/recipe-written.dto';
import { KneaderResult } from './types/kneader-response.type';

@Injectable()
export class KneaderService {
  constructor(private readonly prisma: PrismaService) {}

  async scan(dto: ScanKneaderDto) {
    return this.prisma.$transaction(async (tx) => {
      const executionIngredient = await tx.executionIngredient.findUnique({
        where: {
          qrId: dto.qrId,
        },
        include: {
          ingredient: {
            include: {
              bins: true,
            },
          },

          recipeStep: {
            include: {
              ingredients: true,
            },
          },

          executionBatch: {
            include: {
              kneaderExecution: true,

              execution: {
                include: {
                  recipe: {
                    include: {
                      steps: {
                        include: {
                          ingredients: {
                            include: {
                              ingredient: true,
                            },
                          },
                        },
                        orderBy: {
                          sequenceNumber: 'asc',
                        },
                      },
                    },
                  },
                },
              },

              ingredients: {
                include: {
                  ingredient: true,
                  recipeStep: true,
                },
                orderBy: {
                  plcIngredientIndex: 'asc',
                },
              },
            },
          },
        },
      });

      if (!executionIngredient) {
        throw new NotFoundException('Invalid QR Code.');
      }

      const batch = executionIngredient.executionBatch;

      const kneaderExecution = batch.kneaderExecution;

      if (!kneaderExecution) {
        throw new NotFoundException('Kneader execution not found.');
      }

      if (kneaderExecution.status === 'COMPLETED') {
        return {
          result: KneaderResult.WRONG_BATCH,
          writeRecipe: false,
          scanNext: false,
          readyToStart: false,
          batchComplete: false,
        };
      }

      if (executionIngredient.actualQuantity === null) {
        return {
          result: KneaderResult.WEIGH_NOT_DONE,
        };
      }

      if (executionIngredient.status === IngredientExecutionStatus.CONSUMED) {
        return {
          result: KneaderResult.PROCESS_ALREADY_DONE,
        };
      }

      if (executionIngredient.kneaderScanned) {
        return {
          result: KneaderResult.DUPLICATE_SCAN,
          writeRecipe: false,
          scanNext: false,
          readyToStart: false,
          batchComplete: false,
        };
      }

      const currentRecipeStep = this.getCurrentStep(batch);

      if (!currentRecipeStep) {
        return {
          result: KneaderResult.PROCESS_ALREADY_DONE,
          writeRecipe: false,
          scanNext: false,
          readyToStart: false,
          batchComplete: true,
        };
      }

      if (
        executionIngredient.recipeStep.sequenceNumber !==
        currentRecipeStep.sequenceNumber
      ) {
        return {
          result: KneaderResult.WRONG_STAGE,
          writeRecipe: false,
          scanNext: false,
          readyToStart: false,
          batchComplete: false,
        };
      }

      await tx.executionBatch.update({
        where: {
          id: batch.id,
        },
        data: {
          status: BatchExecutionStatus.RUNNING,
          kneaderStatus: BatchProcessStatus.RUNNING,
          startedAt: batch.startedAt ?? new Date(),
        },
      });

      await tx.execution.update({
        where: {
          id: batch.executionId,
        },
        data: {
          status: ExecutionStatus.RUNNING,
        },
      });

      await tx.executionIngredient.update({
        where: {
          id: executionIngredient.id,
        },
        data: {
          kneaderScanned: true,
        },
      });

      const currentStepIngredients = this.getCurrentStepIngredients(
        batch.ingredients,
        currentRecipeStep.id
      );

      const scannedCount = await tx.executionIngredient.count({
        where: {
          executionBatchId: batch.id,
          recipeStepId: currentRecipeStep.id,
          kneaderScanned: true,
        },
      });

      const totalIngredients = currentStepIngredients.length;

      const allScanned = scannedCount === totalIngredients;

      return {
        result: KneaderResult.VALID,

        executionBatchId: batch.id,

        writeRecipe: !kneaderExecution.recipeWritten,

        recipeCode: batch.execution.recipe.recipeCode,

        stageTimings: this.buildStageTimings(
          batch.execution.recipe.steps,
          kneaderExecution.currentBatchType
        ),

        totalStages: batch.execution.recipe.steps.filter(
          (step) =>
            step.stepType === StepType.KNEADER &&
            step.batchType === kneaderExecution.currentBatchType
        ).length,

        readyToStart: allScanned,

        scanNext: !allScanned,

        batchComplete: false,
      };
    });
  }

  async completeStage(dto: CompleteStageDto) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.executionBatch.findUnique({
        where: {
          id: dto.executionBatchId,
        },
        include: {
          kneaderExecution: true,

          execution: {
            include: {
              recipe: {
                include: {
                  steps: {
                    orderBy: {
                      sequenceNumber: 'asc',
                    },
                  },
                },
              },
            },
          },

          ingredients: {
            include: {
              recipeStep: true,
            },
          },
        },
      });

      if (!batch) {
        throw new NotFoundException('Execution batch not found.');
      }

      if (!batch.kneaderExecution) {
        throw new NotFoundException('Kneader execution not found.');
      }

      const kneaderExecution = batch.kneaderExecution;

      const currentStep = batch.execution.recipe.steps.find(
        (step) =>
          step.stepType === StepType.KNEADER &&
          step.batchType === kneaderExecution.currentBatchType &&
          step.sequenceNumber === kneaderExecution.currentStepSequence
      );

      if (!currentStep) {
        throw new NotFoundException('Current kneader step not found.');
      }

      const pendingScans = await tx.executionIngredient.count({
        where: {
          executionBatchId: batch.id,
          recipeStepId: currentStep.id,
          kneaderScanned: false,
          status: IngredientExecutionStatus.WEIGHED,
        },
      });

      if (pendingScans > 0) {
        throw new BadRequestException(
          'All ingredients of the current stage have not been scanned.'
        );
      }

      await tx.executionIngredient.updateMany({
        where: {
          executionBatchId: batch.id,
          recipeStepId: currentStep.id,
        },
        data: {
          status: IngredientExecutionStatus.CONSUMED,
          kneaderScanned: false,
        },
      });

      const nextStep = batch.execution.recipe.steps.find(
        (step) =>
          step.stepType === StepType.KNEADER &&
          step.batchType === kneaderExecution.currentBatchType &&
          step.sequenceNumber === kneaderExecution.currentStepSequence + 1
      );

      if (nextStep) {
        await tx.kneaderExecution.update({
          where: {
            executionBatchId: batch.id,
          },
          data: {
            currentStepSequence: nextStep.sequenceNumber,
          },
        });

        return {
          success: true,
          stageCompleted: true,
          batchCompleted: false,
          nextStepSequence: nextStep.sequenceNumber,
        };
      }

      const hasFinalBatchSteps = batch.execution.recipe.steps.some(
        (step) =>
          step.stepType === StepType.KNEADER && step.batchType === 'FINAL_BATCH'
      );

      if (
        kneaderExecution.currentBatchType === 'MASTER_BATCH' &&
        hasFinalBatchSteps
      ) {
        await tx.kneaderExecution.update({
          where: {
            executionBatchId: batch.id,
          },
          data: {
            currentBatchType: 'FINAL_BATCH',
            currentStepSequence: 1,
          },
        });

        return {
          success: true,
          stageCompleted: true,
          batchCompleted: false,
          nextBatchType: 'FINAL_BATCH',
          nextStepSequence: 1,
        };
      }

      return this.finishKneader(tx, batch);
    });
  }

  async recipeWritten(dto: RecipeWrittenDto) {
    await this.prisma.kneaderExecution.update({
      where: {
        executionBatchId: dto.executionBatchId,
      },
      data: {
        recipeWritten: true,
      },
    });

    return {
      success: true,
    };
  }

  private async finishKneader(tx: Prisma.TransactionClient, batch: any) {
    await tx.kneaderExecution.update({
      where: {
        executionBatchId: batch.id,
      },
      data: {
        status: KneaderExecutionStatus.COMPLETED,
      },
    });

    await tx.executionBatch.update({
      where: {
        id: batch.id,
      },
      data: {
        kneaderStatus: BatchProcessStatus.COMPLETED,
      },
    });

    const currentBatchType = batch.kneaderExecution.currentBatchType;
    if (currentBatchType === 'MASTER_BATCH') {
      const qrId = `MB-${batch.execution.executionCode}-B${batch.batchNumber}`;

      const masterBatch = await tx.masterBatch.create({
        data: {
          qrId,
          executionBatchId: batch.id,
          recipeId: batch.execution.recipe.id,
        },
      });

      const hasMixingSteps = batch.execution.recipe.steps.some(
        (step: any) => step.stepType === StepType.MIXING
      );

      if (hasMixingSteps) {
        await tx.mixingExecution.create({
          data: {
            executionBatchId: batch.id,
            currentBatchType: 'FINAL_BATCH',
          },
        });
      }

      await tx.executionBatch.update({
        where: {
          id: batch.id,
        },
        data: {
          status: BatchExecutionStatus.RUNNING,
        },
      });

      return {
        success: true,
        stageCompleted: true,
        batchCompleted: false,

        masterBatchId: masterBatch.id,
        qrId: masterBatch.qrId,

        recipeCode: batch.execution.recipe.recipeCode,
        batchNumber: batch.batchNumber,
      };
    }

    const qrId = `FB-${batch.execution.executionCode}-B${batch.batchNumber}`;

    const finalBatch = await tx.finalBatch.create({
      data: {
        qrId,
        executionBatchId: batch.id,
        recipeId: batch.execution.recipe.id,
      },
    });

    await tx.executionBatch.update({
      where: {
        id: batch.id,
      },
      data: {
        status: BatchExecutionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.updateExecutionStatus(tx, batch.executionId);

    return {
      success: true,
      stageCompleted: true,
      batchCompleted: true,

      finalBatchId: finalBatch.id,
      qrId: finalBatch.qrId,

      recipeCode: batch.execution.recipe.recipeCode,
      batchNumber: batch.batchNumber,
    };
  }

  private getCurrentStep(batch: any) {
    return batch.execution.recipe.steps.find(
      (step: any) =>
        step.stepType === StepType.KNEADER &&
        step.batchType === batch.kneaderExecution.currentBatchType &&
        step.sequenceNumber === batch.kneaderExecution.currentStepSequence
    );
  }

  private getCurrentStepIngredients(
    batchIngredients: any[],
    recipeStepId: number
  ) {
    return batchIngredients.filter(
      (ingredient) => ingredient.recipeStepId === recipeStepId
    );
  }

  private buildStageTimings(
    steps: RecipeStep[],
    batchType: RecipeStepBatchType
  ) {
    const timings: number[] = [];

    const kneaderSteps = steps
      .filter(
        (step) =>
          step.stepType === StepType.KNEADER && step.batchType === batchType
      )
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    for (const step of kneaderSteps) {
      timings.push(step.timerSeconds);
    }

    while (timings.length < 5) {
      timings.push(0);
    }

    return timings;
  }

  private async updateExecutionStatus(
    tx: Prisma.TransactionClient,
    executionId: number
  ) {
    const batches = await tx.executionBatch.findMany({
      where: {
        executionId,
      },
      select: {
        status: true,
      },
    });

    if (batches.length === 0) {
      return;
    }

    const allCompleted = batches.every(
      (batch) => batch.status === BatchExecutionStatus.COMPLETED
    );

    await tx.execution.update({
      where: {
        id: executionId,
      },
      data: {
        status: allCompleted
          ? ExecutionStatus.COMPLETED
          : ExecutionStatus.RUNNING,
      },
    });
  }
}
