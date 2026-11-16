import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum AlertStatus {
  ACTIVE = 'Active',
  CLEARED = 'Cleared',
}

export enum AlertType {
  MIN_STOCK = 'MIN_STOCK',
  EXPIRY = 'EXPIRY',
}

export class UpdateAlertStatusDto {
  @IsEnum(AlertStatus)
  status!: AlertStatus;
}

export class GenerateAlertsDto {
  @IsOptional()
  @IsString()
  unit?: string;
}
