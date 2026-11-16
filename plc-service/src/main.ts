import express from 'express';
import { PlcService } from './services/plc.service';
import { ScannerService } from './services/scanner.service';
import { WeighingPlcService } from './services/weighing-plc.service';
import { WeighingListenerService } from './services/weighing-listner.service';
import { KneaderListenerService } from './services/kneader-listner.service';
import { KneaderPlcService } from './services/kneader-plc.service';
import { MixingListenerService } from './services/mixing-listner.service';
import { MixingPlcService } from './services/mixing-plc.service';
import { DeviceStatusService } from './services/device-status.service';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3002;

async function bootstrap() {
  const app = express();
  app.use(express.json());

  const deviceStatusService = new DeviceStatusService();

  const plcService = new PlcService();
  await plcService.start();

  const weighingPlcService = new WeighingPlcService(plcService);

  const scannerService = new ScannerService(plcService, weighingPlcService);
  await scannerService.start();

  const weighingListener = new WeighingListenerService(
    plcService,
    weighingPlcService
  );
  weighingListener.start();

  const kneaderPlcService = new KneaderPlcService(plcService);
  const kneaderListener = new KneaderListenerService(
    plcService,
    kneaderPlcService
  );
  kneaderListener.start();

  const mixingPlcService = new MixingPlcService(plcService);
  const mixingListener = new MixingListenerService(
    plcService,
    mixingPlcService
  );
  mixingListener.start();

  // Health check
  app.get('/health', (req, res) => {
    res.send('PLC Service Running');
  });

  // Device Status
  app.get('/device-status', async (req, res) => {
    try {
      const devices = await deviceStatusService.getStatuses();

      res.json({
        success: true,
        checkedAt: new Date().toISOString(),
        devices,
      });
    } catch (err: any) {
      console.error('Device status check failed:', err);

      res.status(500).json({
        success: false,
        message: err.message || 'Failed to check device status',
      });
    }
  });

  // Read registers
  app.get('/plc/read', async (req, res) => {
    try {
      const data = await plcService.readRegisters(0, 10);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Write register
  app.post('/plc/write', async (req, res) => {
    try {
      const { address, value } = req.body;
      const result = await plcService.writeRegister(address, value);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  //-------------------------------------------------------------------------------
  app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
