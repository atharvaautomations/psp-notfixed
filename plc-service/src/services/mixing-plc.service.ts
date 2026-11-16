import axios from 'axios';
import { PlcService } from './plc.service';
import { MIXING_REGISTERS } from '../config/registers/mixing.registers';
import { PlcType } from '../config/plc-type';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

export class MixingPlcService {
  private currentExecutionBatchId?: number;

  private masterBatchScanned = false;

  constructor(private readonly plc: PlcService) {}

  async processQr(qrId: string) {
    console.log('=================================');
    console.log('Mixing QR:', qrId);
    console.log('masterBatchScanned:', this.masterBatchScanned);
    console.log('=================================');

    if (!this.masterBatchScanned) {
      console.log('Trying QR as MASTER BATCH');

      const masterResult = await this.processMasterBatch(qrId);

      console.log('Master Batch Result:', masterResult);

      if (masterResult !== null) {
        return masterResult;
      }

      console.log('Not a Master Batch. Trying QR as INGREDIENT');

      return this.processIngredient(qrId);
    }

    console.log('Master Batch already scanned. Trying QR as INGREDIENT');

    return this.processIngredient(qrId);
  }

  private async processMasterBatch(qrId: string) {
    console.log('>>> processMasterBatch() called:', qrId);
    try {
      const { data } = await axios.post(
        `${backendUrl}/mixing/scan-master-batch`,
        {
          qrId,
        }
      );
      this.currentExecutionBatchId = data.executionBatchId;
      switch (data.result) {
        case 'MASTER_BATCH_NOT_FOUND':
          return null;

        case 'MASTER_BATCH_ALREADY_USED':
          await this.setBit(MIXING_REGISTERS.PROCESS_ALREADY_DONE);
          return;
      }
      if (data.writeRecipe) {
        await this.writeRecipe(data.recipeName);

        await this.plc.writeRegister(
          MIXING_REGISTERS.TOTAL_STAGES,
          data.totalStages,
          PlcType.MIXING
        );

        await axios.post(`${backendUrl}/mixing/recipe-written`, {
          executionBatchId: data.executionBatchId,
        });
      }
      await this.setBit(MIXING_REGISTERS.CORRECT_QR);

      this.masterBatchScanned = true;

      return data;
    } catch (err: any) {
      console.log('Backend Error:');
      console.log(err.response?.data);
      console.log(err.response?.data?.message);

      throw err;
    }
  }

  private async processIngredient(qrId: string) {
    console.log('>>> processIngredient() called:', qrId);

    try {
      const { data } = await axios.post(
        `${backendUrl}/mixing/scan-ingredient`,
        {
          qrId,
        }
      );

      console.log('<<< scan-ingredient response:', data);

      if (data.result === 'VALID' && data.executionBatchId) {
        this.currentExecutionBatchId = data.executionBatchId;
      }

      switch (data.result) {
        case 'WRONG_QR':
          await this.setBit(MIXING_REGISTERS.WRONG_QR);
          return;

        case 'WRONG_STAGE':
          await this.setBit(MIXING_REGISTERS.WRONG_STAGE);
          return;

        case 'WRONG_BATCH':
          await this.setBit(MIXING_REGISTERS.WRONG_BATCH);
          return;

        case 'PROCESS_ALREADY_DONE':
          await this.setBit(MIXING_REGISTERS.PROCESS_ALREADY_DONE);
          return;

        case 'DUPLICATE_SCAN':
          await this.setBit(MIXING_REGISTERS.QR_NOT_CORRECT);
          return;

        case 'WEIGH_NOT_DONE':
          await this.setBit(MIXING_REGISTERS.WRONG_BATCH);
          return;
      }

      if (data.result === 'VALID' && data.writeRecipe) {
        console.log('Writing mixing recipe to PLC:', data.recipeName);

        await this.writeRecipe(data.recipeName);

        await this.plc.writeRegister(
          MIXING_REGISTERS.TOTAL_STAGES,
          data.totalStages,
          PlcType.MIXING
        );

        await axios.post(`${backendUrl}/mixing/recipe-written`, {
          executionBatchId: data.executionBatchId,
        });

        console.log('Mixing recipe written successfully.');
      }

      await this.setBit(MIXING_REGISTERS.CORRECT_QR);

      if (data.firstIngredient) {
        await this.plc.writeRegister(
          MIXING_REGISTERS.STAGE_TIME,
          data.stageTime,
          PlcType.MIXING
        );

        await this.plc.writeRegister(
          MIXING_REGISTERS.CURRENT_STAGE,
          data.currentStage,
          PlcType.MIXING
        );
      }

      if (data.scanNext) {
        await this.setBit(MIXING_REGISTERS.SCAN_NEXT);
      }

      if (data.readyToStart) {
        await this.setBit(MIXING_REGISTERS.READY_TO_START);
      }

      return data;
    } catch (err: any) {
      console.log('!!! scan-ingredient API ERROR !!!');
      console.log(err.response?.data || err.message);
    }
  }

  async onStageComplete() {
    if (!this.currentExecutionBatchId) {
      console.warn('No active mixing batch.');
      return;
    }

    const result = await this.completeStage(this.currentExecutionBatchId);

    if (result.masterBatchCreated) {
      console.log('Master Batch Created');
      console.log('Master Batch QR:', result.qrId);

      await axios.post(`${backendUrl}/printer/mixing/master-batch`, {
        qrId: result.qrId,
        recipeCode: result.recipeCode,
        batchNumber: result.batchNumber,
      });

      console.log('Master Batch QR Printed');

      return result;
    }

    if (result.batchCompleted) {
      console.log('Mixing Batch Completed');

      await this.setBit(MIXING_REGISTERS.BATCH_COMPLETE);

      console.log('Final Batch QR:', result.qrId);

      await axios.post(`${backendUrl}/printer/mixing/final-batch`, {
        qrId: result.qrId,
        recipeCode: result.recipeCode,
        batchNumber: result.batchNumber,
      });

      this.currentExecutionBatchId = undefined;
      this.masterBatchScanned = false;

      return result;
    }

    console.log('Moved to Mixing Stage:', result.nextStageSequence);

    return result;
  }

  private async completeStage(executionBatchId: number) {
    const { data } = await axios.post(`${backendUrl}/mixing/stage-complete`, {
      executionBatchId,
    });

    console.log('Mixing Stage Complete:', data);

    return data;
  }

  private async writeRecipe(recipeName: string) {
    await this.plc.writeAscii(
      MIXING_REGISTERS.RECIPE_START,
      recipeName,
      MIXING_REGISTERS.RECIPE_LENGTH,
      PlcType.MIXING
    );
  }

  private async setBit(address: number) {
    console.log(`Setting M${address}`);
    await this.plc.writeCoil(address, true, PlcType.MIXING);
  }
}
