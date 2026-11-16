/*
  Warnings:

  - You are about to drop the column `quantity` on the `ExecutionIngredient` table. All the data in the column will be lost.
  - You are about to drop the `Batch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchIngredient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchStep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BulkWeighingSeed` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExecutionScan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinalProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductExecution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StepExecution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeighedBag` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `recipeCode` to the `Execution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipeName` to the `Execution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipeVersion` to the `Execution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expectedQuantity` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ingredientCode` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ingredientName` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ingredientType` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `materialName` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stepSequence` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stepType` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `Ingredient` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `type` on the `Ingredient` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."Batch" DROP CONSTRAINT "Batch_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchIngredient" DROP CONSTRAINT "BatchIngredient_batchStepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchIngredient" DROP CONSTRAINT "BatchIngredient_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchStep" DROP CONSTRAINT "BatchStep_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BatchStep" DROP CONSTRAINT "BatchStep_recipeStepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BulkWeighingSeed" DROP CONSTRAINT "BulkWeighingSeed_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BulkWeighingSeed" DROP CONSTRAINT "BulkWeighingSeed_batchIngredientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BulkWeighingSeed" DROP CONSTRAINT "BulkWeighingSeed_batchStepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BulkWeighingSeed" DROP CONSTRAINT "BulkWeighingSeed_productExecutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExecutionScan" DROP CONSTRAINT "ExecutionScan_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExecutionScan" DROP CONSTRAINT "ExecutionScan_batchIngredientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExecutionScan" DROP CONSTRAINT "ExecutionScan_batchStepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExecutionScan" DROP CONSTRAINT "ExecutionScan_productExecutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FinalProduct" DROP CONSTRAINT "FinalProduct_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FinalProduct" DROP CONSTRAINT "FinalProduct_productExecutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductExecution" DROP CONSTRAINT "ProductExecution_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StepExecution" DROP CONSTRAINT "StepExecution_batchStepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StepExecution" DROP CONSTRAINT "StepExecution_productExecutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WeighedBag" DROP CONSTRAINT "WeighedBag_batchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WeighedBag" DROP CONSTRAINT "WeighedBag_batchIngredientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WeighedBag" DROP CONSTRAINT "WeighedBag_batchStepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WeighedBag" DROP CONSTRAINT "WeighedBag_productExecutionId_fkey";

-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "recipeCode" TEXT NOT NULL,
ADD COLUMN     "recipeName" TEXT NOT NULL,
ADD COLUMN     "recipeVersion" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ExecutionIngredient" DROP COLUMN "quantity",
ADD COLUMN     "expectedQuantity" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "ingredientCode" TEXT NOT NULL,
ADD COLUMN     "ingredientName" TEXT NOT NULL,
ADD COLUMN     "ingredientType" TEXT NOT NULL,
ADD COLUMN     "materialName" TEXT NOT NULL,
ADD COLUMN     "stepSequence" INTEGER NOT NULL,
ADD COLUMN     "stepType" "StepType" NOT NULL,
ADD COLUMN     "timerSeconds" INTEGER;

-- AlterTable
ALTER TABLE "Ingredient" ALTER COLUMN "name" SET NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QcInspection" ADD COLUMN     "compressionSetTarget" DOUBLE PRECISION,
ADD COLUMN     "elongationTarget" DOUBLE PRECISION,
ADD COLUMN     "hardnessTarget" DOUBLE PRECISION,
ADD COLUMN     "specificGravityTarget" DOUBLE PRECISION,
ADD COLUMN     "tensileTarget" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "public"."Batch";

-- DropTable
DROP TABLE "public"."BatchIngredient";

-- DropTable
DROP TABLE "public"."BatchStep";

-- DropTable
DROP TABLE "public"."BulkWeighingSeed";

-- DropTable
DROP TABLE "public"."ExecutionScan";

-- DropTable
DROP TABLE "public"."FinalProduct";

-- DropTable
DROP TABLE "public"."ProductExecution";

-- DropTable
DROP TABLE "public"."StepExecution";

-- DropTable
DROP TABLE "public"."WeighedBag";

-- DropEnum
DROP TYPE "public"."BagStatus";

-- DropEnum
DROP TYPE "public"."BatchStatus";

-- DropEnum
DROP TYPE "public"."BulkSeedStatus";

-- DropEnum
DROP TYPE "public"."IngredientType";

-- DropEnum
DROP TYPE "public"."ProductExecutionStatus";

-- DropEnum
DROP TYPE "public"."StepExecutionStatus";
