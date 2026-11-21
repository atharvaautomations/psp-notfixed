import { IsInt, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsInt()
  userId?: number;
}