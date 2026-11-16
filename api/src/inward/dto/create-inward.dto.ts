import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsEnum,
  IsPositive,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export enum UnitType {
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  NOS = 'NOS',
}

export class CreateInwardDto {
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

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsDateString()
  batchDate?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  grnNumber?: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsDateString()
  grnDate?: string;

  @IsOptional()
  @IsString()
  shelfLife?: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsDateString()
  qcDate?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  supplierInvoiceNumber?: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsEnum(UnitType)
  unit!: UnitType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  bagWeight?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  storedAsWhole?: boolean;

  @IsDateString()
  mfgDate!: string;

  @IsDateString()
  expDate!: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export interface InwardResponse {
  id: number;
  materialName: string;
  materialNumber?: string | null;
  supplierName: string;
  batchNumber?: string | null;
  batchDate?: string | null;
  grnNumber?: string | null;
  grnDate?: string | null;
  shelfLife?: string | null;
  qcDate?: string | null;
  supplierInvoiceNumber?: string | null;
  invoiceDate?: string | null;
  quantity: number;
  unit: UnitType;
  baseQuantity: number;
  baseUnit: UnitType;
  bagWeight?: number | null;
  bagWeightBase?: number | null;
  storedAsWhole: boolean;
  mfgDate: string;
  expDate: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  qrCodes?: Array<{ id: number; code: string }>;
  isExpired: boolean;
  canEdit: boolean;
  canPrintQr: boolean;
  canDelete: boolean;
}
