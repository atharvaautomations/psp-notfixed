import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsPositive,
  IsArray,
  IsInt,
} from 'class-validator';

export enum UnitType {
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  NOS = 'NOS',
}

export class CreateOutwardDto {
  @IsOptional()
  @IsString()
  materialName?: string;

  @IsInt()
  @IsPositive()
  inwardId!: number;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  unit?: UnitType;

  @IsString()
  @IsNotEmpty()
  issuedTo!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedQrIds?: string[];
}

export interface OutwardResponse {
  id: number;
  materialName: string;
  quantity: number;
  unit: UnitType;
  baseQuantity: number;
  baseUnit: UnitType;
  issuedTo: string;
  purpose?: string | null;
  remarks?: string | null;
  qrScanStatus: any;
  status: string;
  bagsIssued?: number | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}
