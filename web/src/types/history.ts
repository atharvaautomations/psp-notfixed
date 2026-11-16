export type HistoryEntryType = 'inward' | 'outward';

export type HistoryStatus = 'Active' | 'Expired' | 'Completed' | 'Pending';

export interface HistoryEntry {
  id: number;
  type: HistoryEntryType;
  referenceNumber: string;
  materialName: string;
  quantity: number;
  unit: UnitType;
  partyName: string;
  status: HistoryStatus;
  date: string;
  qrScans?: number;
  totalQrBags?: number;
  batchNumber?: string | null;
  canPrintQr?: boolean;
  receivedAt?: string | null;
}

export type UnitType = 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'NOS';

export type HistoryTypeFilter = 'All' | 'inward' | 'outward';

export type TimeRangeFilter = 'All' | 'Last 24 Hours' | 'This Week' | 'This Month' | 'Custom Range';

export interface HistoryFilters {
  search?: string;
  type?: HistoryTypeFilter;
  status?: string;
  timeRange?: TimeRangeFilter;
  startDate?: string | null;
  endDate?: string | null;
  sort?: 'asc' | 'desc';
}
