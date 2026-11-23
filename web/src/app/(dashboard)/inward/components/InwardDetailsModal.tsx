// src/app/inward/components/InwardDetailsModal.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Inward } from '@/types/inward';
import { StatusBadge } from '@/components/ui/status-badge';

interface InwardDetailsModalProps {
  open: boolean;
  onClose: () => void;
  item: Inward | null;
  onEdit: () => void;
}

export default function InwardDetailsModal({
  open,
  onClose,
  item,
}: InwardDetailsModalProps) {
  if (!item) return null;

  const createdAtDisplay = new Date(
    item.createdAt ?? item.mfgDate
  ).toLocaleDateString();

  const isExpired = item.isExpired || item.status === 'Expired';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-lg shadow-xl border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Inward Entry Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-y-3 mt-3 text-sm">
          <div className="font-medium text-gray-600">ID</div>
          <div className="text-gray-900">#{item.id}</div>

          <div className="font-medium text-gray-600">Material</div>
          <div className="text-gray-900">{item.materialName}</div>

          {item.materialNumber && (
            <>
              <div className="font-medium text-gray-600">Material Number</div>
              <div className="text-gray-900">{item.materialNumber}</div>
            </>
          )}

          <div className="font-medium text-gray-600">Supplier</div>
          <div>{item.supplierName}</div>

          {item.batchNumber && (
            <>
              <div className="font-medium text-gray-600">Batch No.</div>
              <div>{item.batchNumber}</div>
            </>
          )}

          {item.batchDate && (
            <>
              <div className="font-medium text-gray-600">Batch Date</div>
              <div>{new Date(item.batchDate).toLocaleDateString()}</div>
            </>
          )}

          {item.grnNumber && (
            <>
              <div className="font-medium text-gray-600">GRN Number</div>
              <div className="text-gray-900">{item.grnNumber}</div>
            </>
          )}

          {item.grnDate && (
            <>
              <div className="font-medium text-gray-600">GRN Date</div>
              <div>{new Date(item.grnDate).toLocaleDateString()}</div>
            </>
          )}

          {item.shelfLife && (
            <>
              <div className="font-medium text-gray-600">Shelf Life</div>
              <div>{item.shelfLife}</div>
            </>
          )}

          <div className="font-medium text-gray-600">Quantity</div>
          <div>
            {item.quantity} {item.unit}
          </div>

          <div className="font-medium text-gray-600">Bag Weight</div>
          <div>{item.bagWeight ? `${item.bagWeight} ${item.unit}` : '-'}</div>

          {item.supplierInvoiceNumber && (
            <>
              <div className="font-medium text-gray-600">Supplier Invoice No.</div>
              <div>{item.supplierInvoiceNumber}</div>
            </>
          )}

          {item.invoiceDate && (
            <>
              <div className="font-medium text-gray-600">Invoice Date</div>
              <div>{new Date(item.invoiceDate).toLocaleDateString()}</div>
            </>
          )}

          <div className="font-medium text-gray-600">QC Date</div>
          <div>
            {item.qcDate ? new Date(item.qcDate).toLocaleDateString() : '-'}
          </div>

          <div className="font-medium text-gray-600">Mfg Date</div>
          <div>{new Date(item.mfgDate).toLocaleDateString()}</div>

          <div className="font-medium text-gray-600">Expiry Date</div>
          <div>
            {new Date(item.expDate).toLocaleDateString()}
          </div>

          <div className="font-medium text-gray-600">Entry Date</div>
          <div>{createdAtDisplay}</div>

          <div className="font-medium text-gray-600">Status</div>
          <div>
            <StatusBadge status={isExpired ? 'Expired' : 'Active'} />
          </div>

          <div className="font-medium text-gray-600">QR Codes</div>
          <div>
            {item.qrCodes && item.qrCodes.length > 0 ? (
              <span className="text-green-700 font-medium">
                {item.qrCodes.length} generated
              </span>
            ) : (
              <span className="text-gray-500">Not generated</span>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
