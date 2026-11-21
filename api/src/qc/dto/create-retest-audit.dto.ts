import { IsInt, IsString } from 'class-validator';

export class CreateRetestAuditDto {
  @IsInt()
  qcInspectionId!: number;

  @IsString()
  stage!: string;

  @IsString()
  deviation!: string;

  @IsString()
  reason!: string;

  @IsString()
  actionTaken!: string;

  @IsString()
  approvedBy!: string;
}