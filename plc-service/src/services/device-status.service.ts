import * as net from 'net';
import { exec } from 'child_process';

import { PRODUCTION_PLC } from '../config/production.plc';
import { MIXING_PLC } from '../config/mixing.plc';
import { HMI_CONFIG } from '../config/hmi.config';
import { SYSTEM_CONFIG } from '../config/system.config';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'NOT_CONFIGURED';

export interface DeviceStatusResult {
  name: string;
  type: 'PLC' | 'HMI' | 'PC';
  ip: string;
  status: DeviceStatus;
}

interface NetworkDeviceConfig {
  name: string;
  ip: string;
}

export class DeviceStatusService {
  /**
   * TCP connectivity check.
   * Used for PLCs because their Modbus TCP port is known.
   */
  private checkTcp(ip: string, port: number, timeout = 1500): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      let completed = false;

      const finish = (result: boolean) => {
        if (completed) return;

        completed = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(timeout);

      socket.once('connect', () => {
        finish(true);
      });

      socket.once('timeout', () => {
        finish(false);
      });

      socket.once('error', () => {
        finish(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Ping network device.
   *
   * Used for:
   * - HMI
   * - Store PC
   * - QC PC
   * - Server / Production PC
   *
   * This checks whether the device itself is reachable
   * instead of assuming that port 80 is open.
   */
  private checkNetworkDevice(ip: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!ip) {
        resolve(false);
        return;
      }

      // Windows:
      // -n 1 = send one ping
      // -w 1500 = wait maximum 1500 ms
      exec(`ping -n 1 -w 1500 ${ip}`, (error) => {
        resolve(!error);
      });
    });
  }

  async getStatuses(): Promise<DeviceStatusResult[]> {
    const devices: DeviceStatusResult[] = [];

    // --------------------------------------------------
    // PLCs
    // --------------------------------------------------

    const plcDevices = [
      {
        name: 'Production PLC',
        ip: PRODUCTION_PLC.host,
        port: PRODUCTION_PLC.port,
      },
      {
        name: 'Mixing PLC',
        ip: MIXING_PLC.host,
        port: MIXING_PLC.port,
      },
    ];

    for (const device of plcDevices) {
      if (!device.ip) {
        devices.push({
          name: device.name,
          type: 'PLC',
          ip: '',
          status: 'NOT_CONFIGURED',
        });

        continue;
      }

      const online = await this.checkTcp(device.ip, device.port);

      devices.push({
        name: device.name,
        type: 'PLC',
        ip: device.ip,
        status: online ? 'ONLINE' : 'OFFLINE',
      });
    }

    // --------------------------------------------------
    // HMIs
    // --------------------------------------------------

    const hmis = Object.values(HMI_CONFIG) as NetworkDeviceConfig[];

    for (const hmi of hmis) {
      if (!hmi.ip) {
        devices.push({
          name: hmi.name,
          type: 'HMI',
          ip: '',
          status: 'NOT_CONFIGURED',
        });

        continue;
      }

      const online = await this.checkNetworkDevice(hmi.ip);

      devices.push({
        name: hmi.name,
        type: 'HMI',
        ip: hmi.ip,
        status: online ? 'ONLINE' : 'OFFLINE',
      });
    }

    // --------------------------------------------------
    // PCs
    // --------------------------------------------------

    const pcs = Object.values(SYSTEM_CONFIG) as NetworkDeviceConfig[];

    for (const pc of pcs) {
      if (!pc.ip) {
        devices.push({
          name: pc.name,
          type: 'PC',
          ip: '',
          status: 'NOT_CONFIGURED',
        });

        continue;
      }

      const online = await this.checkNetworkDevice(pc.ip);

      devices.push({
        name: pc.name,
        type: 'PC',
        ip: pc.ip,
        status: online ? 'ONLINE' : 'OFFLINE',
      });
    }

    return devices;
  }
}
