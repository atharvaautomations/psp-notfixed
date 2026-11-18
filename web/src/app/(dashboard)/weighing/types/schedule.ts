export interface ScheduleItem {
  id: number;
  scheduleCode: string;
  executionId: number;
  executionCode: string;
  recipeName: string;
  recipeVersion: number;
  scheduleDate: string;
  operatorId: number;
  operatorName: string;
  status: 'PENDING' | 'SUCCESS' | 'EXPIRED';
  createdAt: string;
  createdByName: string;
}

export interface ScheduleFormData {
  executionId: number;
  operatorId: number;
  scheduleDate: string;
}

export interface ExecutionOption {
  id: number;
  executionCode: string;
  recipeName: string;
  recipeVersion: number;
  totalBatches: number;
  status: string;
}

export interface OperatorOption {
  id: number;
  name: string;
  username: string;
}