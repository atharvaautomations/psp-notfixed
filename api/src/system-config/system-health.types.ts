export type HealthStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'DISABLED';

export interface HealthResult {
  key: string;
  name: string;
  category: 'DEVICE' | 'SERVICE';

  status: HealthStatus;

  host: string;
  port?: number | null;

  responseTimeMs?: number | null;

  checkedAt: Date;

  message?: string;
}
