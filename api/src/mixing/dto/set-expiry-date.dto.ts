import { IsInt, IsOptional, Min, IsDateString } from 'class-validator';

export class SetExpiryDateDto {
  @IsInt()
  @Min(0)
  daysAfterCompletion!: number;

  @IsOptional()
  @IsDateString()
  explicitExpiryDate?: string;
}