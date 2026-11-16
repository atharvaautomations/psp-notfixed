export interface MixingLabelData {
  qrId: string;
  recipeCode: string;
  batchNumber: number;
  labelType: 'MASTER' | 'FINAL';
  completedAt: Date | string;
}
