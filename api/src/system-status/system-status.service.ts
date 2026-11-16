import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { PrinterStatusService } from '../printer/printer-status.service';

const plcServiceUrl = process.env.PLC_SERVICE_URL ?? 'http://localhost:3002';

@Injectable()
export class SystemStatusService {
  constructor(private readonly printerStatusService: PrinterStatusService) {}

  async getStatus() {
    /*
     * --------------------------------------------------
     * PRINTER STATUS
     * --------------------------------------------------
     */

    const printers = await this.printerStatusService.getStatuses();

    /*
     * --------------------------------------------------
     * PLC SERVICE DEVICE STATUS
     * --------------------------------------------------
     */

    let networkDevices: any[] = [];
    let plcServiceOnline = false;

    try {
      const { data } = await axios.get(`${plcServiceUrl}/device-status`, {
        timeout: 10000,
      });

      networkDevices = data.devices ?? [];
      plcServiceOnline = true;
    } catch (error) {
      console.error('Unable to get device status from PLC service.');

      plcServiceOnline = false;
    }

    /*
     * --------------------------------------------------
     * COMBINE RESULTS
     * --------------------------------------------------
     */

    return {
      success: true,

      checkedAt: new Date().toISOString(),

      plcServiceOnline,

      devices: [...networkDevices, ...printers],
    };
  }
}
