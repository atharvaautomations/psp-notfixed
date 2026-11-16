'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  useUpdateSystemDevice,
  useUpdateSystemService,
  SystemDevice,
  SystemService,
} from '@/hooks/useSystemConfig';

import {
  Activity,
  Cable,
  Database,
  Network,
  Printer,
  RefreshCw,
  Server,
  Settings2,
  Wifi,
} from 'lucide-react';

import {
  Header,
  PageContainer,
  Card,
  CardContent,
  CardHeader,
} from '@/components/global';

import { Button } from '@/components/ui/button';

import {
  useSystemDevices,
  useSystemHealth,
  useSystemServices,
  useSystemSettings,
} from '@/hooks/useSystemConfig';

function statusClasses(status?: string) {
  switch (status) {
    case 'ONLINE':
    case 'HEALTHY':
      return 'bg-green-100 text-green-700';

    case 'WARNING':
      return 'bg-amber-100 text-amber-700';

    case 'OFFLINE':
    case 'CRITICAL':
      return 'bg-red-100 text-red-700';

    case 'DISABLED':
      return 'bg-gray-100 text-gray-600';

    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function statusDot(status?: string) {
  switch (status) {
    case 'ONLINE':
    case 'HEALTHY':
      return 'bg-green-500';

    case 'WARNING':
      return 'bg-amber-500';

    case 'OFFLINE':
    case 'CRITICAL':
      return 'bg-red-500';

    default:
      return 'bg-gray-400';
  }
}

export default function SystemConfigPage() {
  const { mutateAsync: updateDevice, isPending: updatingDevice } =
    useUpdateSystemDevice();

  const { mutateAsync: updateService, isPending: updatingService } =
    useUpdateSystemService();

  const [selectedDevice, setSelectedDevice] = useState<SystemDevice | null>(
    null
  );

  const [selectedService, setSelectedService] = useState<SystemService | null>(
    null
  );

  const [deviceHost, setDeviceHost] = useState('');
  const [devicePort, setDevicePort] = useState('');
  const [deviceProtocol, setDeviceProtocol] = useState('');

  const [serviceHost, setServiceHost] = useState('');
  const [servicePort, setServicePort] = useState('');
  const [serviceHealthPath, setServiceHealthPath] = useState('');
  const { data: devices = [], isLoading: devicesLoading } = useSystemDevices();

  const { data: services = [], isLoading: servicesLoading } =
    useSystemServices();

  const { data: settings = [] } = useSystemSettings();

  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
    isFetching: healthRefreshing,
  } = useSystemHealth();

  const plcs = devices.filter((device) => device.type === 'PLC');

  const printers = devices.filter((device) => device.type === 'PRINTER');

  const getDeviceHealth = (key: string) =>
    health?.devices.find((item) => item.key === key);

  const getServiceHealth = (key: string) =>
    health?.services.find((item) => item.key === key);

  const getSetting = (key: string) =>
    settings.find((setting) => setting.key === key)?.value;

  function openDeviceConfig(device: SystemDevice) {
    setSelectedDevice(device);
    setDeviceHost(device.host);
    setDevicePort(device.port?.toString() ?? '');
    setDeviceProtocol(device.protocol ?? '');
  }

  function openServiceConfig(service: SystemService) {
    setSelectedService(service);
    setServiceHost(service.host);
    setServicePort(service.port.toString());
    setServiceHealthPath(service.healthPath ?? '');
  }

  return (
    <PageContainer>
      <Header
        title="System Configuration"
        description="Monitor system health, devices, services, and deployment infrastructure"
        icon="🛠️"
      />

      <div className="flex justify-end mb-6">
        <Button
          variant="outline"
          onClick={() => refetchHealth()}
          disabled={healthRefreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${healthRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh Health
        </Button>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Overall Health</div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${statusDot(
                  health?.overallStatus
                )}`}
              />

              <span className="text-lg font-semibold">
                {healthLoading
                  ? 'Checking...'
                  : health?.overallStatus ?? 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Total Components</div>

            <div className="mt-2 text-2xl font-semibold">
              {health?.summary.total ?? '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Online</div>

            <div className="mt-2 text-2xl font-semibold text-green-600">
              {health?.summary.online ?? '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Offline</div>

            <div className="mt-2 text-2xl font-semibold text-red-600">
              {health?.summary.offline ?? '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-gray-500">Warning</div>

            <div className="mt-2 text-2xl font-semibold text-amber-600">
              {health?.summary.warning ?? '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Site Information */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-gray-600" />

            <div>
              <h3 className="font-semibold text-gray-900">
                Deployment Information
              </h3>

              <p className="text-sm text-gray-500">
                Current installation and network details
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-gray-500">Site</div>

              <div className="mt-1 font-medium">
                {getSetting('SITE_NAME') ?? '-'}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Server IP</div>

              <div className="mt-1 font-medium">
                {getSetting('SERVER_IP') ?? '-'}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">LAN Subnet</div>

              <div className="mt-1 font-medium">
                {getSetting('LAN_SUBNET') ?? '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PLCs */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <Cable className="h-5 w-5 text-gray-700" />

          <div>
            <h2 className="text-lg font-semibold">PLCs</h2>

            <p className="text-sm text-gray-500">
              Industrial controller communication
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {devicesLoading ? (
            <Card>
              <CardContent className="p-6">Loading PLCs...</CardContent>
            </Card>
          ) : (
            plcs.map((plc) => {
              const item = getDeviceHealth(plc.key);

              return (
                <Card key={plc.key}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <Wifi className="h-5 w-5" />

                          <h3 className="font-semibold">{plc.name}</h3>
                        </div>

                        <div className="mt-4 space-y-1 text-sm">
                          <div>
                            <span className="text-gray-500">Address:</span>{' '}
                            {plc.host}
                            {plc.port ? `:${plc.port}` : ''}
                          </div>

                          <div>
                            <span className="text-gray-500">Protocol:</span>{' '}
                            {plc.protocol ?? '-'}
                          </div>

                          <div>
                            <span className="text-gray-500">Response:</span>{' '}
                            {item?.responseTimeMs != null
                              ? `${item.responseTimeMs} ms`
                              : '-'}
                          </div>
                          <div className="mt-5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeviceConfig(plc)}
                            >
                              Configure
                            </Button>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses(
                          item?.status
                        )}`}
                      >
                        {item?.status ?? 'NOT CHECKED'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Printers */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <Printer className="h-5 w-5 text-gray-700" />

          <div>
            <h2 className="text-lg font-semibold">Printers</h2>

            <p className="text-sm text-gray-500">Network label printers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {printers.map((printer) => {
            const item = getDeviceHealth(printer.key);

            return (
              <Card key={printer.key}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <Printer className="h-5 w-5" />

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                        item?.status
                      )}`}
                    >
                      {item?.status ?? 'NOT CHECKED'}
                    </span>
                  </div>

                  <h3 className="mt-4 font-semibold">{printer.name}</h3>

                  <div className="mt-2 text-sm text-gray-600">
                    {printer.host}
                    {printer.port ? `:${printer.port}` : ''}
                  </div>

                  <div className="mt-1 text-xs text-gray-500">
                    {item?.responseTimeMs != null
                      ? `${item.responseTimeMs} ms`
                      : 'No response time'}
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeviceConfig(printer)}
                    >
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Services */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <Activity className="h-5 w-5 text-gray-700" />

          <div>
            <h2 className="text-lg font-semibold">Application Services</h2>

            <p className="text-sm text-gray-500">
              Core software and runtime services
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {servicesLoading ? (
            <Card>
              <CardContent className="p-6">Loading services...</CardContent>
            </Card>
          ) : (
            services.map((service) => {
              const item = getServiceHealth(service.key);

              const Icon =
                service.type === 'DATABASE'
                  ? Database
                  : service.type === 'FRONTEND'
                  ? Network
                  : Server;

              return (
                <Card key={service.key}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5" />

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                          item?.status
                        )}`}
                      >
                        {item?.status ?? 'NOT CHECKED'}
                      </span>
                    </div>

                    <h3 className="mt-4 font-semibold">{service.name}</h3>

                    <div className="mt-2 text-sm text-gray-600">
                      {service.host}:{service.port}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      {item?.responseTimeMs != null
                        ? `${item.responseTimeMs} ms`
                        : '-'}
                    </div>

                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openServiceConfig(service)}
                      >
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Basic Topology */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <Network className="h-5 w-5 text-gray-700" />

          <div>
            <h2 className="text-lg font-semibold">System Topology</h2>

            <p className="text-sm text-gray-500">
              Logical overview of the MES deployment
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-8">
              <div className="rounded-lg border px-6 py-4 text-center">
                <Server className="mx-auto h-6 w-6" />

                <div className="mt-2 font-semibold">MES Server</div>

                <div className="text-sm text-gray-500">
                  {getSetting('SERVER_IP') ?? '-'}
                </div>
              </div>

              <div className="h-10 w-px bg-gray-300" />

              <div className="rounded-lg border px-6 py-4 text-center">
                <Network className="mx-auto h-6 w-6" />

                <div className="mt-2 font-semibold">LAN Network</div>

                <div className="text-sm text-gray-500">
                  {getSetting('LAN_SUBNET') ?? '-'}
                </div>
              </div>

              <div className="h-10 w-px bg-gray-300" />

              <div className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {devices.map((device) => {
                  const item = getDeviceHealth(device.key);

                  return (
                    <div
                      key={device.key}
                      className="rounded-lg border p-4 text-center"
                    >
                      <span
                        className={`mx-auto block h-3 w-3 rounded-full ${statusDot(
                          item?.status
                        )}`}
                      />

                      <div className="mt-2 text-sm font-medium">
                        {device.name}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {device.host}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={!!selectedDevice}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDevice(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Configure {selectedDevice?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>IP Address / Host</Label>

              <Input
                value={deviceHost}
                onChange={(e) => setDeviceHost(e.target.value)}
                placeholder="192.168.1.10"
              />
            </div>

            <div className="space-y-2">
              <Label>Port</Label>

              <Input
                type="number"
                value={devicePort}
                onChange={(e) => setDevicePort(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Protocol</Label>

              <Input
                value={deviceProtocol}
                onChange={(e) => setDeviceProtocol(e.target.value)}
                placeholder="MODBUS_TCP"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDevice(null)}>
              Cancel
            </Button>

            <Button
              disabled={updatingDevice}
              onClick={async () => {
                if (!selectedDevice) return;

                await updateDevice({
                  key: selectedDevice.key,
                  data: {
                    host: deviceHost.trim(),
                    port: devicePort ? Number(devicePort) : undefined,
                    protocol: deviceProtocol.trim(),
                  },
                });

                setSelectedDevice(null);
              }}
            >
              {updatingDevice ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedService}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedService(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Configure {selectedService?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Host</Label>

              <Input
                value={serviceHost}
                onChange={(e) => setServiceHost(e.target.value)}
                placeholder="127.0.0.1"
              />
            </div>

            <div className="space-y-2">
              <Label>Port</Label>

              <Input
                type="number"
                value={servicePort}
                onChange={(e) => setServicePort(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Health Path</Label>

              <Input
                value={serviceHealthPath}
                onChange={(e) => setServiceHealthPath(e.target.value)}
                placeholder="/health"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedService(null)}>
              Cancel
            </Button>

            <Button
              disabled={updatingService}
              onClick={async () => {
                if (!selectedService) {
                  return;
                }

                await updateService({
                  key: selectedService.key,
                  data: {
                    host: serviceHost.trim(),
                    port: Number(servicePort),
                    healthPath: serviceHealthPath.trim(),
                  },
                });

                setSelectedService(null);
              }}
            >
              {updatingService ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
