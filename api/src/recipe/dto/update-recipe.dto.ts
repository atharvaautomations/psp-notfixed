import {
  IsArray,
  IsString,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StepIngredientDto {
  @IsString()
  ingredientCode!: string;

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsInt()
  @Min(0)
  tolerance!: number;

  @IsString()
  unit!: string;
}

export class StepDto {
  @IsString()
  stepType!: string;

  @IsString()
  batchType!: string;

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

export class UpdateRecipeDto {
  @IsString()
  recipeCode!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  workflow!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps!: StepDto[];
}
