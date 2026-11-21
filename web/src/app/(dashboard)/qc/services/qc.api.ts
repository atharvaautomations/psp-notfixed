import api from '@/lib/api';

export interface QcSpecificationParameter {
  id: number;
  specificationId: number;
  name: string;
  testMethod?: string;
  unit?: string;
  targetValue?: number;
  tolerance?: number;
  toleranceType?: string;
  displayOrder: number;
  isEnabled: boolean;
  isDependentOnElongation: boolean;
}

export interface QcSpecification {
  id: number;
  recipeId: number;
  hardness?: number;
  tensile?: number;
  elongation?: number;
  specificGravity?: number;
  compressionSet?: number;
  recipe: {
    id: number;
    recipeCode: string;
    name: string;
  };
  parameters?: QcSpecificationParameter[];
}

export interface QcSpecificationPayload {
  recipeId: number;
  hardness?: number;
  tensile?: number;
  elongation?: number;
  specificGravity?: number;
  compressionSet?: number;
  parameters?: QcSpecificationParameter[];
}

export interface ScanQcResponse {
  finalBatchId: number;
  qrId: string;
  recipe?: {
    id: number;
    recipeCode: string;
    name: string;
  };
  batch?: {
    batchNumber?: number;
    execution?: {
      executionCode?: string;
    };
    [key: string]: unknown;
  };
  specification: {
    hardness?: number;
    tensile?: number;
    elongation?: number;
    specificGravity?: number;
    compressionSet?: number;
    parameters?: QcSpecificationParameter[];
  };
}

export interface QcInspectionParameterInputDto {
  specificationParameterId: number;
  actualValue?: string;
  result?: 'PASS' | 'FAIL' | 'RETEST';
  observations?: string;
  isEnabled?: boolean;
  testMethod?: string;
  unit?: string;
  specificationText?: string | null;
}

export interface InspectionPayload {
  finalBatchId: number;
  parameters: QcInspectionParameterInputDto[];
  remarks?: string;
  inspectedById?: number;
  inspectionId?: number;
}

export type QcParameterResult = 'PASS' | 'FAIL' | 'RETEST';

export interface QcInspectionFile {
  id: number;
  inspectionId: number;
  parameterId?: number;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: {
    id: number;
    name: string;
  };
  createdAt: string;
}

export interface QcInspectionParameter {
  id: number;
  inspectionId: number;
  specificationParameterId: number;
  specificationParameter?: QcSpecificationParameter;
  actualValue?: string | null;
  result?: 'PASS' | 'FAIL' | 'RETEST';
  observations?: string;
  isEnabled: boolean;
  testMethod?: string | null;
  unit?: string | null;
  specificationText?: string | null;
  files?: QcInspectionFile[];
}

export interface QcInspectionHistoryItem {
  id: number;
  status: 'PASS' | 'FAIL' | 'RETEST';
  overallResult?: 'PASS' | 'FAIL' | 'RETEST';
  remarks?: string;
  testedAt?: string;
  parameters?: QcInspectionParameter[];
  files?: QcInspectionFile[];
  retestAudits?: any[];
  labelInfo?: any;
  finalBatch: {
    id?: number;
    qrId: string;
    recipe: {
      recipeCode: string;
      name?: string;
    };
    executionBatch: {
      batchNumber: number;
      execution: {
        executionCode: string;
      };
    };
    qcSpecification?: {
      id: number;
      recipeId: number;
    };
    parameters?: QcInspectionParameter[];
    files?: QcInspectionFile[];
    inspectedBy?: {
      id: number;
      name: string;
    };
    testedAt?: string;
    createdAt?: string;
  };
}

export interface SaveLabelInfoDto {
  finalBatchId: number;
  qcInspectionId?: number;
  customerName: string;
  partName: string;
  partNumber: string;
  expiryDate: string;
  compoundName: string;
  qcStatus: string;
}

export interface CreateRetestAuditDto {
  qcInspectionId: number;
  stage: string;
  deviation: string;
  reason: string;
  actionTaken: string;
  approvedBy: string;
}

export interface QcInspectionDetail {
  id: number;
  status: 'PASS' | 'FAIL' | 'RETEST';
  overallResult?: 'PASS' | 'FAIL' | 'RETEST';
  finalBatch: {
    qrId: string;
    recipe: {
      id: number;
      recipeCode: string;
      name: string;
    };
    executionBatch: {
      batchNumber: number;
      execution: {
        executionCode: string;
      };
    };
    qcSpecification?: {
      id: number;
      recipeId: number;
      parameters: QcSpecificationParameter[];
    };
    parameters: QcInspectionParameter[];
    files: QcInspectionFile[];
    inspectedBy?: {
      id: number;
      name: string;
    };
    remarks?: string;
    overallResult?: 'PASS' | 'FAIL' | 'RETEST';
    testedAt: string;
    createdAt: string;
  };
  parameters: QcInspectionParameter[];
}

export interface ScanQcResponse {
  finalBatchId: number;
  qrId: string;
  recipe?: {
    id: number;
    recipeCode: string;
    name: string;
  };
  batch?: {
    batchNumber?: number;
    execution?: {
      executionCode?: string;
    };
    [key: string]: unknown;
  };
  specification: {
    hardness?: number;
    tensile?: number;
    elongation?: number;
    specificGravity?: number;
    compressionSet?: number;
    parameters?: QcSpecificationParameter[];
  };
}

export const qcApi = {
  getSpecifications: () => api.get<QcSpecification[]>('/qc/specification'),

  createSpecification: (data: QcSpecificationPayload) =>
    api.post('/qc/specification', data),

  updateSpecification: (id: number, data: QcSpecificationPayload) =>
    api.patch(`/qc/specification/${id}`, data),

  deleteSpecification: (id: number) => api.delete(`/qc/specification/${id}`),

  getSpecificationParameters: (id: number) =>
    api.get<QcSpecificationParameter[]>(`/qc/specification/${id}/parameters`),

  createSpecificationParameter: (id: number, data: QcSpecificationParameter) =>
    api.post(`/qc/specification/${id}/parameters`, data),

  updateSpecificationParameter: (id: number, data: Partial<QcSpecificationParameter>) =>
    api.patch(`/qc/parameters/${id}`, data),

  deleteSpecificationParameter: (id: number) => api.delete(`/qc/parameters/${id}`),

  scanQr: (qrId: string) => api.post<ScanQcResponse>('/qc/scan', { qrId }),

  createInspection: (data: InspectionPayload) =>
    api.post('/qc/inspection', data),

  getInspections: () => api.get<QcInspectionHistoryItem[]>('/qc/inspection'),

  getInspectionById: (id: number) =>
    api.get<QcInspectionDetail>(`/qc/inspection/${id}`),

  uploadFile: (data: FormData) =>
    api.post('/qc/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getInspectionFiles: (id: number) =>
    api.get<QcInspectionFile[]>(`/qc/inspection/${id}/files`),

  deleteFile: (id: number) => api.delete(`/qc/files/${id}`),

  printQrLabel: (qrId: string) => api.post('/printer/print', { qrId }),

  printQcLabel: (data: {
    qrId: string;
    recipeCode: string;
    batchNumber: number;
    qcResult: 'PASS' | 'FAIL';
    customerName?: string;
    partName?: string;
    partNumber?: string;
    expiryDate?: string;
    compoundName?: string;
  }) => api.post('/printer/qc/print', data),

  saveLabelInfo: (data: SaveLabelInfoDto) =>
    api.post('/qc/label-info', data),

  getLabelInfo: (finalBatchId: number) =>
    api.get(`/qc/label-info/${finalBatchId}`),

  createRetestAudit: (data: CreateRetestAuditDto) =>
    api.post('/qc/retest-audit', data),

  getRetestAudit: (inspectionId: number) =>
    api.get(`/qc/retest-audit/${inspectionId}`),
};
