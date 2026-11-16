import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MixingResult } from './types/mixing-response.type';
import { ScanMasterBatchDto } from './dto/scan-master-batch.dto';
import {
  BatchProcessStatus,
  BatchExecutionStatus,
  ExecutionStatus,
  IngredientExecutionStatus,
  MasterBatchStatus,
  MixingExecutionStatus,
  Prisma,
  StepType,
} from '@prisma/client';
import { ScanIngredientDto } from './dto/scan-ingredient.dto';
import { CompleteStageDto } from './dto/complete-stage.dto';

@Injectable()
export class MixingService {
  constructor(private readonly prisma: PrismaService) {}

  async scanMasterBatch(dto: ScanMasterBatchDto) {
    const masterBatch = await this.prisma.masterBatch.findUnique({
      where: {
        qrId: dto.qrId,
      },
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

        executionBatch: {
          include: {
            mixingExecution: true,

            execution: {
              select: {
                id: true,
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

    if (!masterBatch) {
      return {
        result: MixingResult.MASTER_BATCH_NOT_FOUND,
      };
    }

    if (masterBatch.status === MasterBatchStatus.CONSUMED) {
      return {
        result: MixingResult.MASTER_BATCH_ALREADY_USED,
      };
    }

    const mixingExecution = masterBatch.executionBatch.mixingExecution;

    if (!mixingExecution) {
      throw new NotFoundException('Mixing execution not found.');
    }

    if (mixingExecution.status === MixingExecutionStatus.COMPLETED) {
      return {
        result: MixingResult.PROCESS_ALREADY_DONE,
      };
    }

    await this.prisma.mixingExecution.update({
      where: {
        executionBatchId: masterBatch.executionBatchId,
      },
      data: {
        currentBatchType: 'FINAL_BATCH',
        currentStageSequence: 1,
        recipeWritten: false,
        status: MixingExecutionStatus.IN_PROGRESS,
      },
    });

    await this.prisma.executionBatch.update({
      where: {
        id: masterBatch.executionBatchId,
      },
      data: {
        status: BatchExecutionStatus.RUNNING,
        mixingStatus: BatchProcessStatus.RUNNING,
      },
    });

    await this.prisma.execution.update({
      where: {
        id: masterBatch.executionBatch.executionId,
      },
      data: {
        status: ExecutionStatus.RUNNING,
      },
    });

    await this.prisma.masterBatch.update({
      where: {
        id: masterBatch.id,
      },
      data: {
        status: MasterBatchStatus.CONSUMED,
      },
    });

    const mixingSteps = masterBatch.recipe.steps.filter(
      (step) =>
        step.stepType === StepType.MIXING && step.batchType === 'FINAL_BATCH'
    );

    return {
      result: MixingResult.VALID,

      executionBatchId: masterBatch.executionBatchId,

      recipeName: masterBatch.recipe.recipeCode,

      totalStages: mixingSteps.length,

      writeRecipe: !mixingExecution.recipeWritten,
    };
  }

  async scanIngredient(dto: ScanIngredientDto) {
    return this.prisma.$transaction(async (tx) => {
      const executionIngredient = await tx.executionIngredient.findUnique({
        where: {
          qrId: dto.qrId,
        },
        include: {
          recipeStep: true,

          ingredient: {
            include: {
              bins: true,
            },
          },

          executionBatch: {
            include: {
              mixingExecution: true,

              execution: {
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
                },
              },

              ingredients: {
                include: {
                  recipeStep: true,
                  ingredient: true,
                },
                orderBy: {
                  plcIngredientIndex: 'asc',
                },
              },
            },
          },
        },
      });

      /*
       * QR NOT FOUND
       */
      if (!executionIngredient) {
        return {
          result: MixingResult.WRONG_QR,
        };
      }

      const batch = executionIngredient.executionBatch;
      let mixingExecution = batch.mixingExecution;

      if (!mixingExecution) {
        throw new NotFoundException('Mixing execution not found.');
      }

      if (mixingExecution.status === MixingExecutionStatus.COMPLETED) {
        return {
          result: MixingResult.PROCESS_ALREADY_DONE,
        };
      }

      const currentStage = batch.execution.recipe.steps.find(
        (step) =>
          step.stepType === StepType.MIXING &&
          step.batchType === mixingExecution?.currentBatchType &&
          step.sequenceNumber === mixingExecution?.currentStageSequence
      );

      if (!currentStage) {
        return {
          result: MixingResult.PROCESS_ALREADY_DONE,
        };
      }

      if (executionIngredient.recipeStepId !== currentStage.id) {
        return {
          result: MixingResult.WRONG_STAGE,
        };
      }

      let writeRecipe = false;

      if (
        !mixingExecution.recipeWritten &&
        (mixingExecution.currentBatchType === 'MASTER_BATCH' ||
          mixingExecution.currentBatchType === 'FINAL_BATCH')
      ) {
        mixingExecution = await tx.mixingExecution.update({
          where: {
            executionBatchId: batch.id,
          },

          data: {
            status: MixingExecutionStatus.IN_PROGRESS,

            recipeWritten: true,
          },
        });

        writeRecipe = true;
      }

      if (!mixingExecution.recipeWritten) {
        return {
          result: MixingResult.WRONG_BATCH,
        };
      }

      if (executionIngredient.actualQuantity === null) {
        return {
          result: MixingResult.WEIGH_NOT_DONE,
        };
      }

      if (executionIngredient.status === IngredientExecutionStatus.CONSUMED) {
        return {
          result: MixingResult.PROCESS_ALREADY_DONE,
        };
      }

      if (executionIngredient.mixingScanned) {
        return {
          result: MixingResult.DUPLICATE_SCAN,
        };
      }

      await tx.executionBatch.update({
        where: {
          id: batch.id,
        },
        data: {
          status: BatchExecutionStatus.RUNNING,
          mixingStatus: BatchProcessStatus.RUNNING,
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
          mixingScanned: true,
        },
      });

      const currentStageIngredients = batch.ingredients.filter(
        (ingredient) => ingredient.recipeStepId === currentStage.id
      );

      const scannedCount = await tx.executionIngredient.count({
        where: {
          executionBatchId: batch.id,

          recipeStepId: currentStage.id,

          mixingScanned: true,
        },
      });

      const totalIngredients = currentStageIngredients.length;

      const allScanned = scannedCount === totalIngredients;

      const isFirstIngredient = scannedCount === 1;

      const stageTime = currentStage.timerSeconds;

      const currentStageNumber = currentStage.sequenceNumber;

      const totalStages = batch.execution.recipe.steps.filter(
        (step) =>
          step.stepType === StepType.MIXING &&
          step.batchType === mixingExecution.currentBatchType
      ).length;

      return {
        result: MixingResult.VALID,

        executionBatchId: batch.id,

        recipeName: batch.execution.recipe.recipeCode,

        currentStageId: currentStage.id,

        currentStage: currentStageNumber,

        stageTime,

        firstIngredient: isFirstIngredient,

        readyToStart: allScanned,

        scanNext: !allScanned,

        writeRecipe,

        totalStages,
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
          mixingExecution: true,
          masterBatch: true,

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

      if (!batch.mixingExecution) {
        throw new NotFoundException('Mixing execution not found.');
      }

      const mixingExecution = batch.mixingExecution;

      const currentStage = batch.execution.recipe.steps.find(
        (step) =>
          step.stepType === StepType.MIXING &&
          step.batchType === mixingExecution.currentBatchType &&
          step.sequenceNumber === mixingExecution.currentStageSequence
      );

      if (!currentStage) {
        throw new NotFoundException('Current mixing stage not found.');
      }

      const pendingScans = await tx.executionIngredient.count({
        where: {
          executionBatchId: batch.id,
          recipeStepId: currentStage.id,
          mixingScanned: false,
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
          recipeStepId: currentStage.id,
        },
        data: {
          status: IngredientExecutionStatus.CONSUMED,
          mixingScanned: false,
        },
      });

      const nextStage = batch.execution.recipe.steps.find(
        (step) =>
          step.stepType === StepType.MIXING &&
          step.batchType === mixingExecution.currentBatchType &&
          step.sequenceNumber === mixingExecution.currentStageSequence + 1
      );

      if (nextStage) {
        await tx.mixingExecution.update({
          where: {
            executionBatchId: batch.id,
          },
          data: {
            currentStageSequence: nextStage.sequenceNumber,
          },
        });

        return {
          success: true,
          stageCompleted: true,
          batchCompleted: false,
          nextStageSequence: nextStage.sequenceNumber,
        };
      }

      return this.finishMixing(tx, batch);
    });
  }

  private async finishMixing(tx: Prisma.TransactionClient, batch: any) {
    const currentBatchType = batch.mixingExecution.currentBatchType;

    if (currentBatchType === 'MASTER_BATCH' && !batch.masterBatch) {
      const qrId = `MB-${batch.execution.executionCode}-B${batch.batchNumber}`;

      const masterBatch = await tx.masterBatch.create({
        data: {
          qrId,
          executionBatchId: batch.id,
          recipeId: batch.execution.recipe.id,
        },
      });

      return {
        success: true,
        stageCompleted: true,
        batchCompleted: false,

        masterBatchCreated: true,
        masterBatchId: masterBatch.id,
        qrId: masterBatch.qrId,

        recipeCode: batch.execution.recipe.recipeCode,
        batchNumber: batch.batchNumber,
      };
    }

    await tx.mixingExecution.update({
      where: {
        executionBatchId: batch.id,
      },
      data: {
        status: MixingExecutionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await tx.executionBatch.update({
      where: {
        id: batch.id,
      },
      data: {
        mixingStatus: BatchProcessStatus.COMPLETED,
        status: BatchExecutionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const qrId = `FB-${batch.execution.executionCode}-B${batch.batchNumber}`;

    const finalBatch = await tx.finalBatch.create({
      data: {
        qrId,
        executionBatchId: batch.id,
        recipeId: batch.execution.recipe.id,
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

  async recipeWritten(executionBatchId: number) {
    await this.prisma.mixingExecution.update({
      where: {
        executionBatchId,
      },
      data: {
        recipeWritten: true,
        status: MixingExecutionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    return {
      success: true,
    };
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
