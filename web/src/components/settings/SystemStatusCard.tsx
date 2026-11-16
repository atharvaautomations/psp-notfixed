'use client';

import { RefreshCw } from 'lucide-react';

import { Card, CardContent } from '@/components/global';
import { Button } from '@/components/ui/button';
import { useSystemStatus } from '@/hooks/useSystemStatus';

export default function SystemStatusCard() {
  const { data, isLoading, isError, isFetching, refetch } = useSystemStatus();

  const visibleDevices =
    data && !Array.isArray(data) && data.devices
      ? data.devices.filter(
          (device) => device.type === 'PLC' || device.type === 'PRINTER'
        )
      : [];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-100 text-green-700';

      case 'OFFLINE':
        return 'bg-red-100 text-red-700';

      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              System Status
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Current connectivity status of MES hardware and systems
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />

            {isFetching ? 'Checking...' : 'Refresh'}
          </Button>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-sm text-gray-500">
            Checking system status...
          </div>
        )}

        {isError && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            Unable to retrieve system status.
          </div>
        )}

        {data && (
          <>
            {!data.plcServiceOnline && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  PLC Service is not reachable.
                </p>

                <p className="mt-1 text-xs text-red-600">
                  PLC connectivity status could not be checked.
                </p>
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-lg border">
              <div className="grid grid-cols-4 border-b bg-gray-50 px-4 py-3 text-xs font-medium uppercase text-gray-500">
                <div>Device</div>
                <div>Type</div>
                <div>IP Address</div>
                <div className="text-right">Status</div>
              </div>

              {visibleDevices.map((device, index) => (
                <div
                  key={`${device.type}-${device.name}`}
                  className={`grid grid-cols-4 items-center px-4 py-4 ${
                    index !== visibleDevices.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{device.name}</div>

                  <div className="text-sm text-gray-600">{device.type}</div>

                  <div className="text-sm text-gray-600">
                    {device.ip || 'Not configured'}
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                        device.status
                      )}`}
                    >
                      {device.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-right text-xs text-gray-400">
              Last checked: {new Date(data.checkedAt).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
