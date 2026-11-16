'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { Header, PageContainer } from '@/components/global';
import { Button } from '@/components/ui/button';

import {
  UNIT_LABELS,
  UnitFilter,
  parseUnitFilter,
  useInventoryMaterials,
} from '@/hooks/useInventory';

import { UnitFilterSelect } from '../components/UnitFilterSelect';
import { MaterialHistoryDialog } from '../components/MaterialHistoryDialog';
import { formatQty } from '../components/format';

const PAGE_SIZE = 10;

export default function InventoryMaterialsPage() {
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('All Units');
  const [filterReady, setFilterReady] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState<{
    materialName: string;
    supplierName?: string;
  } | null>(null);

  useEffect(() => {
    setUnitFilter(
      parseUnitFilter(
        new URLSearchParams(window.location.search).get('unit')
      )
    );
    setFilterReady(true);
  }, []);

  useEffect(() => {
    if (!filterReady) return;

    const url = new URL(window.location.href);

    if (unitFilter === 'All Units') {
      url.searchParams.delete('unit');
    } else {
      url.searchParams.set('unit', unitFilter);
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [unitFilter, filterReady]);

  useEffect(() => {
    setPage(1);
  }, [unitFilter]);

  const { data: materials = [], isLoading } = useInventoryMaterials({
    unit: unitFilter,
    enabled: filterReady,
  });

  const totalPages = Math.max(1, Math.ceil(materials.length / PAGE_SIZE));

  const visibleMaterials = useMemo(
    () =>
      materials.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE),
    [materials, page]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((value) => {
      if (value === 1 || value === totalPages) return true;
      return Math.abs(value - page) <= 1;
    });

  const backHref =
    unitFilter === 'All Units'
      ? '/inventory'
      : `/inventory?unit=${unitFilter}`;

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Header
          title="Material Inventory"
          description="Complete stock position for every material"
          icon="📦"
        />

        <UnitFilterSelect
          value={unitFilter}
          onChange={setUnitFilter}
          className="sm:pt-2"
        />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            All Materials
            {unitFilter === 'All Units'
              ? ''
              : ` - ${UNIT_LABELS[unitFilter]}`}
          </h2>
          <p className="text-sm text-gray-500">
            {isLoading || !filterReady
              ? 'Loading materials...'
              : `${materials.length} material${
                  materials.length === 1 ? '' : 's'
                } found`}
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href={backHref}>Back to Dashboard</Link>
        </Button>
      </div>

      {/* Material Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <div className="col-span-full py-10 text-center text-gray-500">
            Loading inventory...
          </div>
        )}
        {!isLoading && visibleMaterials.length === 0 && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-center text-gray-500">
            {`No materials found${unitFilter === 'All Units' ? '' : ` for ${UNIT_LABELS[unitFilter]}`}.`}
          </div>
        )}
        {!isLoading && visibleMaterials.length > 0 && (
          visibleMaterials.map((material) => (
            <div
              key={`${material.materialName}-${material.unit}-${material.supplierName ?? 'no-supplier'}`}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() =>
                setSelectedMaterial({
                  materialName: material.materialName,
                  supplierName: material.supplierName ?? undefined,
                })
              }
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {material.materialName}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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
                </div>

                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Total Inward</span>
                    <span className="font-semibold text-blue-600">
                      {formatQty(material.totalInward, material.unit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Total Outward</span>
                    <span className="font-semibold text-orange-600">
                      {formatQty(material.totalOutward, material.unit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Current Stock</span>
                    <span className="font-semibold text-green-600">
                      {formatQty(material.currentStock, material.unit)}
                    </span>
                  </div>
                  {material.expiredQuantity > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium text-red-600">
                        Expired Qty
                      </span>
                      <span className="font-semibold text-red-600">
                        {formatQty(material.expiredQuantity, material.unit)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Unit</span>
                    <span>{UNIT_LABELS[material.unit as keyof typeof UNIT_LABELS]}</span>
                  </div>
                  {material.supplierName && (
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">Supplier</span>
                      <span className="text-gray-500">
                        {material.supplierName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Last Inward</span>
                    <span>{material.lastInward ? new Date(material.lastInward).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Last Outward</span>
                    <span>{material.lastOutward ? new Date(material.lastOutward).toLocaleDateString() : '-'}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMaterial({
                      materialName: material.materialName,
                      supplierName: material.supplierName ?? undefined,
                    });
                  }}
                >
                  View History
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {filterReady && !isLoading && materials.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>

            {pageNumbers.map((value, index) => {
              const previous = pageNumbers[index - 1];
              const showEllipsis = previous && value - previous > 1;

              return (
                <span key={value} className="flex items-center gap-1">
                  {showEllipsis && (
                    <span className="px-1 text-gray-500">...</span>
                  )}
                  <Button
                    size="sm"
                    variant={page === value ? 'default' : 'outline'}
                    onClick={() => setPage(value)}
                  >
                    {value}
                  </Button>
                </span>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Material History Popup */}
      <MaterialHistoryDialog
        materialName={selectedMaterial?.materialName ?? null}
        supplierName={selectedMaterial?.supplierName}
        onClose={() => setSelectedMaterial(null)}
      />
    </PageContainer>
  );
}
