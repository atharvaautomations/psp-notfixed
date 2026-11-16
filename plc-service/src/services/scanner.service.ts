import axios from 'axios';

import { PRODUCTION_REGISTERS } from '../config/registers/production.registers';
import { PlcService } from './plc.service';
import { WeighingPlcService } from './weighing-plc.service';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

export class ScannerService {
  private processing = false;

  constructor(
    private readonly plcService: PlcService,
    private readonly weighingPlcService: WeighingPlcService
  ) {}

  async start(): Promise<void> {
    console.log('Scanner Service Started');

    setInterval(async () => {
      if (this.processing) {
        return;
      }

      this.processing = true;

      try {
        const qrCode = await this.readScannedQRCode();

        if (qrCode) {
          const result = await this.sendQRCodeToBackend(qrCode);

          if (result.payload) {
            await this.weighingPlcService.process(result.payload);
            await this.triggerScanSuccess();
          } else if (result.binNumber) {
            await this.weighingPlcService.openLoadingBin(
              Number(result.binNumber)
            );
          }

          console.log(result);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('PLC not connected')) {
          return;
        }

        console.error('Scanner Error:', message);

        await this.triggerScanFailureSafely();
      } finally {
        this.processing = false;
      }
    }, 200);
  }

  async isScanAvailable(): Promise<boolean> {
    const coils = await this.plcService.readCoils(
      PRODUCTION_REGISTERS.SCANNER.TRIGGER,
      1
    );

    return coils[0];
  }

  async readQRCodeRegisters(): Promise<number[]> {
    const registers = await this.plcService.readRegisters(
      PRODUCTION_REGISTERS.SCANNER.QR_START,
      PRODUCTION_REGISTERS.SCANNER.QR_LENGTH
    );

    return registers.map((register) => register.value);
  }

  decodeQRCode(registers: number[]): string {
    let qr = '';

    for (const value of registers) {
      const low = value & 0xff;
      const high = (value >> 8) & 0xff;

      if (low !== 0) {
        qr += String.fromCharCode(low);
      }

      if (high !== 0) {
        qr += String.fromCharCode(high);
      }
    }

    return qr.replace(/\0/g, '').trim();
  }

  async readScannedQRCode(): Promise<string | null> {
    const scanAvailable = await this.isScanAvailable();

    if (!scanAvailable) {
      return null;
    }

    const registers = await this.readQRCodeRegisters();
    const qrCode = this.decodeQRCode(registers);

    await this.plcService.writeCoil(
      PRODUCTION_REGISTERS.SCANNER.TRIGGER,
      false
    );

    return qrCode;
  }

  async handleQr(qrId: string) {
    const result = await this.sendQRCodeToBackend(qrId);

    if (result.payload) {
      await this.weighingPlcService.process(result.payload);
      await this.triggerScanSuccess();
    } else if (result.binNumber) {
      await this.weighingPlcService.openLoadingBin(Number(result.binNumber));
    }

    return result;
  }

  private async triggerScanSuccess(): Promise<void> {
    await this.plcService.writeCoil(PRODUCTION_REGISTERS.SCANNER.SUCCESS, true);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async triggerScanFailure(): Promise<void> {
    await this.plcService.writeCoil(PRODUCTION_REGISTERS.SCANNER.FAILURE, true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await this.plcService.writeCoil(
      PRODUCTION_REGISTERS.SCANNER.FAILURE,
      false
    );
  }

  private async triggerScanFailureSafely(): Promise<void> {
    try {
      await this.triggerScanFailure();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      console.error(`Unable to send scanner failure signal: ${message}`);
    }
  }

  private async sendQRCodeToBackend(qrCode: string) {
    const response = await axios.post(`${backendUrl}/scanner/scan`, {
      qrId: qrCode,
    });

    return response.data;
  }
}
