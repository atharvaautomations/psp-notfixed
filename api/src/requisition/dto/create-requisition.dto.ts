import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum UnitType {
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  NOS = 'NOS',
}

export class CreateRequisitionDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  materialName!: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  materialNumber?: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  requiredQuantity!: number;

  @IsEnum(UnitType)
  unit!: UnitType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  numberOfBags?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  weightPerBag?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sourceInwardId?: number;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  notes?: string;
}

export interface RequisitionResponse {
  id: number;
  requisitionNumber: string;
  materialName: string;
  materialNumber?: string | null;
  supplierName: string;
  batchNumber?: string | null;
  requiredQuantity: number;
  unit: UnitType;
  baseQuantity: number;
  baseUnit: UnitType;
  numberOfBags?: number | null;
  weightPerBag?: number | null;
  sourceInwardId: number | null;
  sourceInwardBatch?: string | null;
  requestedBy: string;
  requestedAt: string;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  fulfilledBy?: string | null;
  fulfilledAt?: string | null;
  linkedOutwardId?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export class UpdateRequisitionDto {
  materialName?: string;
  materialNumber?: string | null;
  supplierName?: string;
  batchNumber?: string | null;
  requiredQuantity?: number;
  unit?: UnitType;
  numberOfBags?: number | null;
  weightPerBag?: number | null;
  sourceInwardId?: number | null;
  notes?: string | null;
  status?: string;
}
