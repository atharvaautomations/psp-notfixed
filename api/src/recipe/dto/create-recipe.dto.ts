import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecipeWorkflow, RecipeStepBatchType, StepType } from '@prisma/client';

export class StepIngredientDto {
  @IsString()
  @MinLength(1)
  ingredientCode!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @Min(0)
  tolerance!: number;

  @IsString()
  @MinLength(1)
  unit!: string;
}

export class RecipeStepDto {
  @IsEnum(StepType)
  stepType!: StepType;

  @IsEnum(RecipeStepBatchType)
  batchType!: RecipeStepBatchType;

  @IsInt()
  @Min(1)
  sequenceNumber!: number;

  @IsInt()
  @Min(0)
  timerSeconds!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepIngredientDto)
  ingredients!: StepIngredientDto[];
}

export class CreateRecipeDto {
  @IsString()
  @MinLength(1)
  recipeCode!: string; // e.g. SR01

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(RecipeWorkflow)
  workflow!: RecipeWorkflow;

  @IsBoolean()
  active = true;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  steps!: RecipeStepDto[];

  @IsString()
  description?: string;

  @IsString()
  masterBatchCompoundName?: string;

  @IsString()
  polymerName?: string;

  @IsString()
  finalBatchCompoundName?: string;
}
