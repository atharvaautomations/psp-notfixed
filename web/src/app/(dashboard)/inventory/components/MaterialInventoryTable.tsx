'use client';

import { useState } from 'react';

import { Card } from '@/components/global';
import { InventoryMaterial } from '@/hooks/useInventory';

import { formatDate, formatQty } from './format';
import { MaterialHistoryDialog } from './MaterialHistoryDialog';

type MaterialInventoryTableProps = {
  materials: InventoryMaterial[];
  loading?: boolean;
  emptyMessage?: string;
};

export function MaterialInventoryTable({
  materials,
  loading = false,
  emptyMessage = 'No materials found.',
}: MaterialInventoryTableProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<{
    materialName: string;
    supplierName?: string;
  } | null>(null);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-5 py-4 text-left font-medium">Material</th>
                <th className="px-5 py-4 text-left font-medium">Supplier</th>
                <th className="px-5 py-4 text-right font-medium">
                  Total Inward
                </th>
                <th className="px-5 py-4 text-right font-medium">
                  Total Outward
                </th>
                <th className="px-5 py-4 text-right font-medium">
                  Current Stock
                </th>
                <th className="px-5 py-4 text-left font-medium">Inward</th>
                <th className="px-5 py-4 text-left font-medium">
                  Last Outward
                </th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    Loading inventory...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  return (
                    <tr
                      key={`${material.materialName}-${material.unit}-${material.supplierName ?? 'no-supplier'}`}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setSelectedMaterial({
                          materialName: material.materialName,
                          supplierName: material.supplierName ?? undefined,
                        })
                      }
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {material.materialName}
                        {material.expiredQuantity > 0 && (
                          <span className="mt-1 block text-xs font-medium text-red-600">
                            Expired qty:{' '}
                            {formatQty(material.expiredQuantity, material.unit)}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {material.supplierName ||
                          material.suppliers.join(', ') ||
                          '-'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {formatQty(material.totalInward, material.unit)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {formatQty(material.totalOutward, material.unit)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatQty(material.currentStock, material.unit)}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(material.lastInward)}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(material.lastOutward)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            material.expired
                              ? 'bg-red-100 text-red-700'
                              : material.status === 'IN_STOCK'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {material.expired
                            ? 'Expired'
                            : material.status === 'IN_STOCK'
                            ? 'In Stock'
                            : 'Out of Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <MaterialHistoryDialog
        materialName={selectedMaterial?.materialName ?? null}
        supplierName={selectedMaterial?.supplierName ?? undefined}
        onClose={() => setSelectedMaterial(null)}
      />
    </>
  );
}
