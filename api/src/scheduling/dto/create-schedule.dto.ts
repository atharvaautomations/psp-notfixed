import { IsNumber, IsDateString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleDto {
  @IsNumber()
  @IsNotEmpty()
  executionId!: number;

  @IsNumber()
  @IsNotEmpty()
  operatorId!: number;

  @IsDateString()
  @IsNotEmpty()
  scheduleDate!: string;
}