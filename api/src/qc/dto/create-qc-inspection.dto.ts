import { IsInt, IsOptional, IsNumber, IsEnum, IsString, IsBoolean, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { QcParameterResult } from '@prisma/client';

export class QcInspectionParameterInputDto {
  @IsInt()
  specificationParameterId!: number;

  @IsOptional()
  @IsString()
  actualValue?: string;

  @IsOptional()
  @IsEnum(QcParameterResult)
  result?: QcParameterResult;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  testMethod?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  specification?: string;
}

export class CreateQcInspectionDto {
  @IsInt()
  finalBatchId!: number;

  @ValidateNested({ each: true })
  @Type(() => QcInspectionParameterInputDto)
  @IsArray()
  parameters!: QcInspectionParameterInputDto[];

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsInt()
  inspectedById?: number;

  @IsOptional()
  @IsInt()
  inspectionId?: number;
}