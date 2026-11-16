-- AlterTable
ALTER TABLE "KneaderExecution" ADD COLUMN     "currentBatchType" "RecipeStepBatchType" NOT NULL DEFAULT 'FINAL_BATCH';

-- AlterTable
ALTER TABLE "MixingExecution" ADD COLUMN     "currentBatchType" "RecipeStepBatchType" NOT NULL DEFAULT 'FINAL_BATCH';
