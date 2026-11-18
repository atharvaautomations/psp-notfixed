import { ExecutionMode } from '@prisma/client';
import { IsEnum, IsInt, Min, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateExecutionDto {
  @IsInt()
  recipeId!: number;

  @IsEnum(ExecutionMode)
  mode!: ExecutionMode;

  @IsInt()
  @Min(1)
  totalBatches!: number;

  @IsOptional()
  @IsString()
  productionBatchNumber?: string;

  @IsOptional()
  @IsDateString()
  masterBatchExpiringDate?: string;

  @IsOptional()
  @IsDateString()
  finalBatchExpiringDate?: string;
}