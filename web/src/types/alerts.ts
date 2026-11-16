export type AlertType = 'MIN_STOCK' | 'EXPIRY';
export type AlertStatus = 'Active' | 'Cleared';

export interface Alert {
  id: number;
  title: string;
  description: string;
  type: AlertType;
  materialName: string;
  supplierName?: string | null;
  unit: string;
  threshold: number | null;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  clearedAt: string | null;
}

export interface UpdateAlertStatus {
  status: AlertStatus;
}
