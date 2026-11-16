export type RequisitionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled' | 'Cancelled';

export type UnitType = 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'NOS';

export interface RequisitionItem {
  id: number;
  requisitionNumber: string;
  materialName: string;
  materialNumber?: string | null;
  supplierName?: string | null;
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
  status: RequisitionStatus;
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

export interface CreateRequisitionPayload {
  materialName: string;
  materialNumber?: string | null;
  supplierName?: string | null;
  batchNumber?: string | null;
  requiredQuantity: number;
  unit: UnitType;
  numberOfBags?: number | null;
  weightPerBag?: number | null;
  sourceInwardId: number | null;
  notes?: string;
}

export type UpdateRequisitionPayload = Partial<CreateRequisitionPayload>;

export interface RequisitionFilters {
  search?: string;
  status?: 'All' | RequisitionStatus;
  sort?: 'asc' | 'desc';
}

export type RequisitionWithOutward = RequisitionItem & {
  outwardId?: number | null;
  outwardNumber?: string | null;
};
