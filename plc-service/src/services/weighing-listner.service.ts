import { PlcService } from './plc.service';
import { WEIGHING_REGISTERS } from '../config/registers/weighing.registers';
import axios from 'axios';
import { WeighingPlcService } from './weighing-plc.service';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

export class WeighingListenerService {
  private timer?: NodeJS.Timeout;
  private lastM3State = false;

  constructor(
    private readonly plcService: PlcService,
    private readonly weighingPlcService: WeighingPlcService
  ) {}

  start() {
    console.log('Weighing Listener Service started.');
    this.timer = setInterval(async () => {
      try {
        const current = (
          await this.plcService.readCoils(
            WEIGHING_REGISTERS.WEIGHING_DONE_BIT,
            1
          )
        )[0];

        if (!this.lastM3State && current) {
          const qrId = this.weighingPlcService.getCurrentQr();

          if (!qrId) {
            this.lastM3State = current;
            return;
          }

          const actualWeight = await this.plcService.readDWord(
            WEIGHING_REGISTERS.ACTUAL_WEIGHT
          );

          console.log(`Weight Captured: ${actualWeight} g for QR ${qrId}`);

          const { data } = await axios.post(`${backendUrl}/weighing/complete`, {
            qrId,
            weight: actualWeight,
          });

          await this.plcService.writeCoil(
            WEIGHING_REGISTERS.WEIGHING_DONE_BIT,
            false
          );

          this.weighingPlcService.clearCurrentQr();

          if (data.weighingCompleted) {
            await new Promise((resolve) => setTimeout(resolve, 10000));

            await this.weighingPlcService.closeAllBins();
          }

          console.log('Ingredient completed.');
        }

        this.lastM3State = current;
      } catch (err) {
        console.error(err);
      }
    }, 200);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
