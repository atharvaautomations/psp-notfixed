import { CreateRequisitionDto } from './create-requisition.dto';

export class UpdateRequisitionDto {
  materialName?: string;
  materialNumber?: string | null;
  supplierName?: string;
  batchNumber?: string | null;
  requiredQuantity?: number;
  unit?: 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'NOS';
  numberOfBags?: number | null;
  weightPerBag?: number | null;
  sourceInwardId?: number | null;
  notes?: string | null;
  status?: string;
}
