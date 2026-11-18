export interface MixingLabelData {
  qrId: string;
  recipeCode: string;
  batchNumber: number;
  labelType: 'MASTER' | 'FINAL';
  completedAt: Date | string;
  productionBatchNumber?: string;
  compoundName?: string;
  mixingDate?: string;
  mixingTime?: string;
  shift?: string;
  expiryDate?: string;
}
