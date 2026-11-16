import {
  PrismaClient,
  SystemDeviceType,
  SystemServiceType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const devices = [
    {
      key: 'PRODUCTION_PLC',
      name: 'Production PLC',
      type: SystemDeviceType.PLC,
      host: '192.168.1.5',
      port: 502,
      protocol: 'MODBUS_TCP',
      sortOrder: 1,
    },
    {
      key: 'MIXING_PLC',
      name: 'Mixing PLC',
      type: SystemDeviceType.PLC,
      host: '192.168.1.6',
      port: 502,
      protocol: 'MODBUS_TCP',
      sortOrder: 2,
    },

    {
      key: 'PRINTER_1',
      name: 'Printer 1',
      type: SystemDeviceType.PRINTER,
      host: '192.168.1.71',
      port: 9100,
      protocol: 'TCP',
      sortOrder: 10,
    },
    {
      key: 'PRINTER_2',
      name: 'Printer 2',
      type: SystemDeviceType.PRINTER,
      host: '192.168.1.72',
      port: 9100,
      protocol: 'TCP',
      sortOrder: 11,
    },
    {
      key: 'PRINTER_3',
      name: 'Printer 3',
      type: SystemDeviceType.PRINTER,
      host: '192.168.1.73',
      port: 9100,
      protocol: 'TCP',
      sortOrder: 12,
    },
    {
      key: 'PRINTER_4',
      name: 'Printer 4',
      type: SystemDeviceType.PRINTER,
      host: '192.168.1.74',
      port: 9100,
      protocol: 'TCP',
      sortOrder: 13,
    },
  ];

  for (const device of devices) {
    await prisma.systemDevice.upsert({
      where: {
        key: device.key,
      },
      update: device,
      create: device,
    });
  }

  const services = [
    {
      key: 'BACKEND',
      name: 'Backend',
      type: SystemServiceType.BACKEND,
      host: '127.0.0.1',
      port: 3000,
      healthPath: '/health',
      sortOrder: 1,
    },
    {
      key: 'FRONTEND',
      name: 'Frontend',
      type: SystemServiceType.FRONTEND,
      host: '127.0.0.1',
      port: 3001,
      sortOrder: 2,
    },
    {
      key: 'DATABASE',
      name: 'PostgreSQL',
      type: SystemServiceType.DATABASE,
      host: '127.0.0.1',
      port: 5432,
      sortOrder: 3,
    },
    {
      key: 'PLC_SERVICE',
      name: 'PLC Service',
      type: SystemServiceType.PLC_SERVICE,
      host: '127.0.0.1',
      port: 4000,
      healthPath: '/health',
      sortOrder: 4,
    },
  ];

  for (const service of services) {
    await prisma.systemService.upsert({
      where: {
        key: service.key,
      },
      update: service,
      create: service,
    });
  }

  const settings = [
    {
      key: 'SITE_NAME',
      value: 'Hossur Rubber Plant',
      description: 'Deployment site name',
    },
    {
      key: 'SERVER_IP',
      value: '192.168.1.100',
      description: 'Main MES server IP address',
    },
    {
      key: 'LAN_SUBNET',
      value: '192.168.1.0/24',
      description: 'MES LAN subnet',
    },
    {
      key: 'DEFAULT_CONNECTION_TIMEOUT',
      value: '5000',
      description: 'Default device connection timeout in milliseconds',
    },
    {
      key: 'DEVICE_RETRY_COUNT',
      value: '3',
      description: 'Number of retries before marking device unhealthy',
    },
    {
      key: 'PLC_POLL_INTERVAL',
      value: '1000',
      description: 'PLC polling interval in milliseconds',
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: {
        key: setting.key,
      },
      update: setting,
      create: setting,
    });
  }

  console.log('System configuration seeded successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
