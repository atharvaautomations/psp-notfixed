import ModbusRTU from 'modbus-serial';

import { MIXING_PLC } from '../config/mixing.plc';
import { PlcType } from '../config/plc-type';
import { PRODUCTION_PLC } from '../config/production.plc';
import { PRODUCTION_REGISTERS } from '../config/registers/production.registers';

interface PlcConfig {
  host: string;
  port: number;
  unitId: number;
  timeout: number;
}

interface RegisterReadResult {
  address: number;
  value: number;
}

export class PlcService {
  private readonly clients = {
    [PlcType.PRODUCTION]: new ModbusRTU(),
    [PlcType.MIXING]: new ModbusRTU(),
  };

  private readonly connected = {
    [PlcType.PRODUCTION]: false,
    [PlcType.MIXING]: false,
  };

  private readonly D_OFFSET = 4096;
  private readonly M_OFFSET = 2048;

  private readonly reconnectTimers: Partial<Record<PlcType, NodeJS.Timeout>> =
    {};

  private readonly reconnectDelayMs = 5000;

  async start(): Promise<void> {
    void this.connectWithRetry(PlcType.PRODUCTION, PRODUCTION_PLC);

    void this.connectWithRetry(PlcType.MIXING, MIXING_PLC);
  }

  private getClient(type: PlcType): ModbusRTU {
    return this.clients[type];
  }

  private ensureConnected(type: PlcType): void {
    if (!this.connected[type]) {
      throw new Error(`${type} PLC not connected`);
    }
  }

  private async connectWithRetry(
    type: PlcType,
    config: PlcConfig
  ): Promise<void> {
    if (this.connected[type]) {
      return;
    }

    try {
      console.log(`Connecting to ${type} PLC at ${config.host}:${config.port}`);

      const client = this.getClient(type);

      if (client.isOpen) {
        client.close(() => undefined);
      }

      await client.connectTCP(config.host, {
        port: config.port,
      });

      client.setID(config.unitId);
      client.setTimeout(config.timeout);

      this.connected[type] = true;

      console.log(`${type} PLC connected`);

      const timer = this.reconnectTimers[type];

      if (timer) {
        clearTimeout(timer);
        delete this.reconnectTimers[type];
      }
    } catch (error: unknown) {
      this.connected[type] = false;

      const message = error instanceof Error ? error.message : String(error);

      console.error(`${type} PLC connection failed: ${message}`);

      this.scheduleReconnect(type, config);
    }
  }

  private scheduleReconnect(type: PlcType, config: PlcConfig): void {
    if (this.reconnectTimers[type]) {
      return;
    }

    console.log(
      `${type} PLC reconnect scheduled in ${
        this.reconnectDelayMs / 1000
      } seconds`
    );

    this.reconnectTimers[type] = setTimeout(() => {
      delete this.reconnectTimers[type];

      void this.connectWithRetry(type, config);
    }, this.reconnectDelayMs);
  }

  private handleCommunicationFailure(type: PlcType, error: unknown): void {
    this.connected[type] = false;

    const message = error instanceof Error ? error.message : String(error);

    console.error(`${type} PLC communication failed: ${message}`);

    const config = type === PlcType.PRODUCTION ? PRODUCTION_PLC : MIXING_PLC;

    this.scheduleReconnect(type, config);
  }

  private async executeWithReconnect<T>(
    plc: PlcType,
    operation: () => Promise<T>
  ): Promise<T> {
    this.ensureConnected(plc);

    try {
      return await operation();
    } catch (error: unknown) {
      this.handleCommunicationFailure(plc, error);
      throw error;
    }
  }

  async readRegisters(
    start = 0,
    count = 100,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<RegisterReadResult[]> {
    return this.executeWithReconnect(plc, async () => {
      const client = this.getClient(plc);

      const result = await client.readHoldingRegisters(
        start + this.D_OFFSET,
        count
      );

      return result.data.map((value, index) => ({
        address: start + index,
        value,
      }));
    });
  }

  async readWords(
    address: number,
    count: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<number[]> {
    return this.executeWithReconnect(plc, async () => {
      const client = this.getClient(plc);

      const result = await client.readHoldingRegisters(
        address + this.D_OFFSET,
        count
      );

      return result.data;
    });
  }

  async readCoils(
    start: number,
    count: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<boolean[]> {
    return this.executeWithReconnect(plc, async () => {
      const client = this.getClient(plc);

      const result = await client.readCoils(start + this.M_OFFSET, count);

      return result.data;
    });
  }

  async readDWord(
    address: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<number> {
    return this.executeWithReconnect(plc, async () => {
      const client = this.getClient(plc);

      const result = await client.readHoldingRegisters(
        address + this.D_OFFSET,
        2
      );

      const low = result.data[0];
      const high = result.data[1];

      return high * 65536 + low;
    });
  }

  async writeRegister(
    address: number,
    value: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<{ success: true; address: number; value: number }> {
    return this.executeWithReconnect(plc, async () => {
      const client = this.getClient(plc);

      await client.writeRegister(this.D_OFFSET + address, value);

      return {
        success: true,
        address,
        value,
      };
    });
  }

  async writeCoil(
    address: number,
    value: boolean,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<{ success: true; address: number; value: boolean }> {
    return this.executeWithReconnect(plc, async () => {
      const client = this.getClient(plc);

      await client.writeCoil(address + this.M_OFFSET, value);

      return {
        success: true,
        address,
        value,
      };
    });
  }

  async writeWord(
    address: number,
    value: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<{ success: true; address: number; value: number }> {
    return this.writeRegister(address, value, plc);
  }

  async writeWords(
    address: number,
    values: number[],
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<void> {
    return this.executeWithReconnect(plc, async () => {
      const client = this.getClient(plc);

      await client.writeRegisters(address + this.D_OFFSET, values);
    });
  }

  async writeFloat(
    address: number,
    value: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<void> {
    const buffer = Buffer.alloc(4);

    buffer.writeFloatBE(value);

    const high = buffer.readUInt16BE(0);
    const low = buffer.readUInt16BE(2);

    await this.writeWords(address, [low, high], plc);
  }

  async writeDWord(
    address: number,
    value: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<void> {
    const high = (value >> 16) & 0xffff;
    const low = value & 0xffff;

    await this.writeWords(address, [low, high], plc);
  }

  async writeAscii(
    address: number,
    text: string,
    words: number,
    plc: PlcType = PlcType.PRODUCTION
  ): Promise<void> {
    const buffer = Buffer.alloc(words * 2);

    buffer.write(text);

    const registers: number[] = [];

    for (let index = 0; index < words; index++) {
      registers.push(buffer.readUInt16BE(index * 2));
    }

    await this.writeWords(address, registers, plc);
  }

  decodeSingleRegister(value: number): string {
    const bytes: number[] = [];
    let temp = value;

    while (temp > 0) {
      bytes.push(temp & 0xff);
      temp >>= 8;
    }

    return bytes.map((byte) => String.fromCharCode(byte)).join('');
  }

  async setBinLoading(binNumber: number): Promise<void> {
    const register =
      PRODUCTION_REGISTERS.BIN_LOADING[
        binNumber as keyof typeof PRODUCTION_REGISTERS.BIN_LOADING
      ];

    if (!register) {
      throw new Error(`Invalid bin number: ${binNumber}`);
    }

    await this.writeRegister(register, 2);

    console.log(`Bin ${binNumber} loading signal sent to D${register}`);
  }
}
