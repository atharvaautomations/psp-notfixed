import { Injectable } from '@nestjs/common';
import * as net from 'net';

import { PRINTERS } from './config/printer.config';

export type PrinterStatus = 'ONLINE' | 'OFFLINE' | 'NOT_CONFIGURED';

export interface PrinterStatusResult {
  name: string;
  type: 'PRINTER';
  ip: string;
  port: number;
  status: PrinterStatus;
}

@Injectable()
export class PrinterStatusService {
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

  async getStatuses(): Promise<PrinterStatusResult[]> {
    const printerDevices = [
      {
        name: 'Inward Printer',
        ...PRINTERS.inward,
      },
      {
        name: 'Weighing Printer',
        ...PRINTERS.weighing,
      },
      {
        name: 'Mixing Printer',
        ...PRINTERS.mixing,
      },
      {
        name: 'QC Printer',
        ...PRINTERS.qc,
      },
    ];

    return Promise.all(
      printerDevices.map(async (printer) => {
        const { name, ip, port } = printer;

        if (!ip) {
          return {
            name,
            type: 'PRINTER' as const,
            ip: '',
            port,
            status: 'NOT_CONFIGURED' as const,
          };
        }

        const online = await this.checkTcp(ip, port);

        return {
          name,
          type: 'PRINTER' as const,
          ip,
          port,
          status: online ? ('ONLINE' as const) : ('OFFLINE' as const),
        };
      })
    );
  }
}
