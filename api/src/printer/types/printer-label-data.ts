export interface PrinterLabelData {
  qrId: string;
  inwardId: number;
  materialName?: string | null;
  bagNumber?: number;
  batchNumber?: string | null;
  batchDate?: Date | string | null;
  grnNumber?: string | null;
  grnDate?: Date | string | null;
  supplierName?: string | null;
  bagWeight?: number | null;
  quantity?: number;
  unit?: string;
  shelfLife?: string | null;
  mfgDate?: Date | string | null;
  expDate?: Date | string | null;
  storedAsWhole?: boolean;
  julianDate: string;
}

export interface WeighingLabelData {
  qrId: string;
  recipeCode: string;
  executionCode: string;
  batchNumber: number;
  ingredientName: string;
  binNumber: string;
  sequenceNumber?: string | number;
  sequenceModule?: string;
  quantity: number;
  tolerance: number;
  julianDate: string;
  mode: 'BULK' | 'SEQUENTIAL';
}
