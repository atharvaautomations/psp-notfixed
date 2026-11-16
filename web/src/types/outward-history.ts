export type OutwardHistoryStatus = 'Dispatched' | 'InTransit' | 'Received' | 'Completed' | 'Cancelled';

export type UnitType = 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'NOS';

export interface OutwardHistoryEntry {
  id: number;
  outwardId: number;
  outwardNumber: string;
  materialName: string;
  quantity: number;
  unit: UnitType;
  recipient: string;
  dispatchedAt: string;
  receivedAt?: string | null;
  status: OutwardHistoryStatus;
  qrScans: number;
  totalQrBags: number;
  notes?: string | null;
  updatedAt?: string;
}

export interface OutwardHistoryFilters {
  search?: string;
  status?: string;
  sort?: 'asc' | 'desc';
}
