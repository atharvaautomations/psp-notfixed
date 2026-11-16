'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  Header,
  PageContainer,
  Card,
  Section,
} from '@/components/global';
import { Button } from '@/components/ui/button';

import { useAlerts, useUpdateAlertStatus } from '@/hooks/useAlerts';
import { Alert } from '@/types/alerts';
import { UnitFilterSelect } from '@/app/(dashboard)/inventory/components/UnitFilterSelect';
import {
  UnitFilter,
  parseUnitFilter,
} from '@/hooks/useInventory';

const STATUS_COLORS: Record<Alert['status'], string> = {
  Active: 'bg-red-100 text-red-700 border-red-200',
  Cleared: 'bg-green-100 text-green-700 border-green-200',
};

const TYPE_LABELS: Record<Alert['type'], string> = {
  MIN_STOCK: 'Minimum Stock',
  EXPIRY: 'Expiry',
};

export default function AlertsPage() {
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('All Units');
  const [filterReady, setFilterReady] = useState(false);

  useEffect(() => {
    setUnitFilter(
      parseUnitFilter(
        new URLSearchParams(window.location.search).get('unit')
      )
    );
    setFilterReady(true);
  }, []);

  useEffect(() => {
    if (!filterReady) return;

    const url = new URL(window.location.href);

    if (unitFilter === 'All Units') {
      url.searchParams.delete('unit');
    } else {
      url.searchParams.set('unit', unitFilter);
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [unitFilter, filterReady]);

  const { data: alerts = [], isLoading } = useAlerts();
  const { mutate: updateAlertStatus, isPending: updating } =
    useUpdateAlertStatus();

  const filteredAlerts = useMemo(() => {
    if (!filterReady) return alerts;
    if (unitFilter === 'All Units') return alerts;
    return alerts.filter((a) => a.unit === unitFilter);
  }, [alerts, unitFilter, filterReady]);

  // Sort: Active alerts first, then Cleared, latest first within each group
  const sortedAlerts = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
      const aActive = a.status === 'Active';
      const bActive = b.status === 'Active';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [filteredAlerts]);

  const activeCount = filteredAlerts.filter((a) => a.status === 'Active').length;
  const clearedCount = filteredAlerts.filter(
    (a) => a.status === 'Cleared'
  ).length;

  const handleStatusChange = (alert: Alert, newStatus: Alert['status']) => {
    updateAlertStatus({ id: alert.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Header
          title="Alerts"
          description="View and manage system-generated alerts"
          icon="🔔"
        />
        <div className="mt-8 flex items-center justify-center h-96">
          <p className="text-sm text-gray-500">Loading alerts...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Header
          title="Alerts"
          description="Monitor and manage stock and expiry alerts"
          icon="🔔"
        />

        <UnitFilterSelect
          value={unitFilter}
          onChange={setUnitFilter}
          className="sm:pt-2"
        />
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <h4 className="text-sm font-medium text-gray-600">Total Alerts</h4>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {filteredAlerts.length}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Active</h4>
          <div className="mt-2 text-2xl font-bold text-red-600">
            {activeCount}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Cleared</h4>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {clearedCount}
          </div>
        </Card>
      </div>

      {/* Alerts Table */}
      <Section title="All Alerts" className="mt-8">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-5 py-4 text-left font-medium">Title</th>
                  <th className="px-5 py-4 text-left font-medium">Material</th>
                  <th className="px-5 py-4 text-left font-medium">Supplier</th>
                  <th className="px-5 py-4 text-left font-medium">Type</th>
                  <th className="px-5 py-4 text-left font-medium">Unit</th>
                  <th className="px-5 py-4 text-left font-medium">Threshold</th>
                  <th className="px-5 py-4 text-left font-medium">Status</th>
                  <th className="px-5 py-4 text-left font-medium">Generated</th>
                  <th className="px-5 py-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedAlerts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      No alerts found.
                    </td>
                  </tr>
                ) : (
                  sortedAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {alert.title}
                        <span className="mt-1 block text-xs font-normal text-gray-500">
                          {alert.description}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {alert.materialName}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {alert.supplierName || '-'}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {TYPE_LABELS[alert.type]}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {alert.unit}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {alert.threshold !== null
                          ? alert.type === 'EXPIRY'
                            ? alert.threshold === 0
                              ? 'Expired'
                              : `${alert.threshold} days`
                            : `${alert.threshold}%`
                          : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
                            STATUS_COLORS[alert.status]
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {new Date(alert.createdAt).toLocaleDateString()}{' '}
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {alert.status === 'Active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                alert,
                                'Cleared' as const
                              )
                            }
                            disabled={updating}
                          >
                            Clear
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
