'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMaterialInventoryHistory } from '@/hooks/useInventory';

import { formatDate, formatQty } from './format';

type MaterialHistoryDialogProps = {
  materialName: string | null;
  supplierName?: string;
  onClose: () => void;
};

export function MaterialHistoryDialog({
  materialName,
  supplierName,
  onClose,
}: MaterialHistoryDialogProps) {
  const { data: history, isLoading: historyLoading } =
    useMaterialInventoryHistory(materialName, supplierName);

  return (
    <Dialog
      open={!!materialName}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>
            {materialName
              ? `${materialName}${
                  supplierName ? ` - ${supplierName}` : ''
                } - Inventory History`
              : 'Inventory History'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Inward and outward transaction history for the selected material.
          </DialogDescription>
        </DialogHeader>

        {historyLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading history...
          </div>
        ) : history ? (
          <div className="space-y-6">
            {/* History Summary */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-gray-500">Total Inward</p>
                <p className="mt-1 text-lg font-semibold text-blue-600">
                  {formatQty(history.totalInward, history.unit)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-gray-500">Total Outward</p>
                <p className="mt-1 text-lg font-semibold text-orange-600">
                  {formatQty(history.totalOutward, history.unit)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-gray-500">Current Stock</p>
                <p className="mt-1 text-lg font-semibold text-green-600">
                  {formatQty(history.currentStock, history.unit)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-gray-500">Status</p>
                <p className="mt-1 font-semibold">
                  {history.status === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                </p>
              </div>
            </div>

            {/* Inward History */}
            <div>
              <h3 className="mb-3 font-semibold">Inward History</h3>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-left">Batch</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-left">Expiry</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.inwardHistory.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-3">{formatDate(item.date)}</td>
                        <td className="px-4 py-3">{item.supplierName}</td>
                        <td className="px-4 py-3">
                          {item.batchNumber ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">
                          +{formatQty(item.quantity, item.unit)}
                        </td>
                        <td className="px-4 py-3">{formatDate(item.expDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Outward History */}
            <div>
              <h3 className="mb-3 font-semibold">Outward History</h3>

              {history.outwardHistory.length === 0 ? (
                <div className="rounded-lg border p-5 text-sm text-gray-500">
                  No outward transactions for this material.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Issued To</th>
                        <th className="px-4 py-3 text-left">Purpose</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {history.outwardHistory.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-3">{formatDate(item.date)}</td>
                          <td className="px-4 py-3">{item.issuedTo}</td>
                          <td className="px-4 py-3">{item.purpose ?? '-'}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-700">
                            -{formatQty(item.quantity, item.unit)}
                          </td>
                          <td className="px-4 py-3">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
