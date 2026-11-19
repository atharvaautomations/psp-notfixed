import { IsInt, IsOptional, IsNumber, IsEnum, IsString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QcParameterResult } from '@prisma/client';

export class QcInspectionParameterInputDto {
  @IsInt()
  specificationParameterId!: number;

  @IsOptional()
  @IsNumber()
  actualValue?: number;

  @IsOptional()
  @IsEnum(QcParameterResult)
  result?: QcParameterResult;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CreateQcInspectionDto {
  @IsInt()
  finalBatchId!: number;

  @ValidateNested({ each: true })
  @Type(() => QcInspectionParameterInputDto)
  parameters!: QcInspectionParameterInputDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}