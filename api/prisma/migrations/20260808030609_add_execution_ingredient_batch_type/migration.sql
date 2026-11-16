/*
  Warnings:

  - You are about to drop the column `pressure` on the `RecipeStep` table. All the data in the column will be lost.
  - You are about to drop the column `rpm` on the `RecipeStep` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `RecipeStep` table. All the data in the column will be lost.
  - You are about to drop the column `workflow` on the `RecipeStep` table. All the data in the column will be lost.
  - Added the required column `batchType` to the `ExecutionIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchType` to the `RecipeStep` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExecutionIngredient" ADD COLUMN     "batchType" "RecipeStepBatchType" NOT NULL;

-- AlterTable
ALTER TABLE "RecipeStep" DROP COLUMN "pressure",
DROP COLUMN "rpm",
DROP COLUMN "temperature",
DROP COLUMN "workflow",
ADD COLUMN     "batchType" "RecipeStepBatchType" NOT NULL;
