/*
  Warnings:

  - Added the required column `workflow` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workflow` to the `RecipeStep` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RecipeWorkflow" AS ENUM ('KNEADER_ONLY', 'KNEADER_AND_MIXING', 'MIXING_FINAL_BATCH', 'MIXING_MASTER_AND_FINAL_BATCH');

-- CreateEnum
CREATE TYPE "RecipeStepBatchType" AS ENUM ('MASTER_BATCH', 'FINAL_BATCH');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "workflow" "RecipeWorkflow" NOT NULL;

-- AlterTable
ALTER TABLE "RecipeStep" ADD COLUMN     "workflow" "RecipeWorkflow" NOT NULL;
