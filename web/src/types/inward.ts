// src/types/inward.ts

export type UnitType = 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'NOS';

export type InwardStatus = 'Active' | 'Expired';

export interface Inward {
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
  baseQuantity?: number;
  baseUnit?: UnitType;
  bagWeight?: number | null;
  bagWeightBase?: number | null;
  storedAsWhole: boolean;
  mfgDate: string;
  expDate: string;
  status: 'Active' | 'Expired';
  canDelete: boolean;
  canEdit: boolean;
  canPrintQr: boolean;
  isExpired: boolean;
  createdAt: string;
  updatedAt?: string;
  qrCodes?: Array<{ id: number; code: string }>;
}

export interface CreateInwardPayload {
  materialName: string;
  materialNumber?: string;
  supplierName: string;
  batchNumber?: string;
  batchDate?: string;
  grnNumber?: string;
  grnDate?: string;
  shelfLife?: string;
  qcDate?: string;
  supplierInvoiceNumber?: string;
  invoiceDate?: string;
  quantity: number;
  unit: UnitType;
  mfgDate: string;
  expDate: string;
  bagWeight?: number;
  storedAsWhole?: boolean;
  status?: string;
}

export type UpdateInwardPayload = Partial<CreateInwardPayload>;

export type InwardSortOrder = 'asc' | 'desc';

export interface InwardFilters {
  search?: string;
  status?: 'All' | InwardStatus;
  sort?: InwardSortOrder;
  unit?: UnitType | 'All Units';
}
