import { IsInt, IsOptional, IsString } from 'class-validator';

export class SaveQcLabelInfoDto {
  @IsInt()
  finalBatchId!: number;

  @IsOptional()
  @IsInt()
  qcInspectionId?: number;

  @IsString()
  customerName!: string;

  @IsString()
  partName!: string;

  @IsString()
  partNumber!: string;

  @IsString()
  expiryDate!: string;

  @IsString()
  compoundName!: string;

  @IsString()
  qcStatus!: string;
}