'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, Header, PageContainer } from '@/components/global';
import { Button } from '@/components/ui/button';

import {
  DisplayUnit,
  InventoryMaterial,
  UNIT_LABELS,
  UnitFilter,
  parseUnitFilter,
  useInventoryMaterials,
  useInventorySummary,
  useInventoryTrend,
  useTopInventoryMaterials,
} from '@/hooks/useInventory';

import { formatNumber } from './components/format';
import { MaterialInventoryTable } from './components/MaterialInventoryTable';
import { UnitFilterSelect } from './components/UnitFilterSelect';

const DISPLAY_UNITS: DisplayUnit[] = ['KG', 'LITRE', 'NOS'];

const PIE_COLORS = [
  '#3b82f6',
  '#f97316',
  '#22c55e',
  '#a855f7',
  '#eab308',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#f43f5e',
];

type UnitValues = Record<DisplayUnit, number>;

function UnitWiseValue({
  values,
  activeUnit,
  loading,
  valueClassName = 'text-gray-900',
}: {
  values?: UnitValues;
  activeUnit: UnitFilter;
  loading: boolean;
  valueClassName?: string;
}) {
  if (loading) {
    return <p className="mt-2 text-2xl font-bold text-gray-400">...</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {DISPLAY_UNITS.map((unit, index) => {
        const dimmed = activeUnit !== 'All Units' && activeUnit !== unit;

        return (
          <span
            key={unit}
            className={`flex items-baseline gap-1 transition-opacity ${
              dimmed ? 'opacity-30' : ''
            }`}
          >
            <span className={`text-xl font-bold ${valueClassName}`}>
              {formatNumber(values?.[unit] ?? 0)}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {UNIT_LABELS[unit]}
            </span>
            {index < DISPLAY_UNITS.length - 1 && (
              <span className="ml-1 text-gray-300">/</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function UnitPie({
  title,
  data,
}: {
  title: string;
  data: Array<{ materialName: string; quantity: number }>;
}) {
  return (
    <div>
      <p className="mb-1 text-center text-xs font-semibold text-gray-600">
        {title}
      </p>

      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-xs text-gray-400">
          No stock
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="quantity"
              nameKey="materialName"
              outerRadius={70}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.materialName}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatNumber(value)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function InventoryDashboard() {
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('All Units');
  const [filterReady, setFilterReady] = useState(false);
  const [stockTab, setStockTab] = useState<'active' | 'expired'>('active');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50];

  // Read the filter from the URL after mount so the page can be opened from
  // the full listing page without needing a Suspense boundary.
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

  const { data: summary, isLoading: summaryLoading } = useInventorySummary();

  const { data: materials = [], isLoading: materialsLoading } =
    useInventoryMaterials({ unit: unitFilter, enabled: filterReady });

  const { data: trend = [], isLoading: trendLoading } = useInventoryTrend({
    unit: unitFilter,
    enabled: filterReady,
  });

  const { data: topMaterials = [], isLoading: topMaterialsLoading } =
    useTopInventoryMaterials({ unit: unitFilter, enabled: filterReady });

  const byUnitValues = summary?.byUnit;

  const activeAllMaterials = useMemo(
    () => materials.filter((material) => !material.expired),
    [materials]
  );
  const expiredAllMaterials = useMemo(
    () => materials.filter((material) => material.expired),
    [materials]
  );

  const activeMaterials = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeAllMaterials.slice(start, start + pageSize);
  }, [activeAllMaterials, page, pageSize]);

  const expiredMaterials = useMemo(() => {
    const start = (page - 1) * pageSize;
    return expiredAllMaterials.slice(start, start + pageSize);
  }, [expiredAllMaterials, page, pageSize]);

  const activeTotalPages = Math.max(
    1,
    Math.ceil(activeAllMaterials.length / pageSize)
  );
  const expiredTotalPages = Math.max(
    1,
    Math.ceil(expiredAllMaterials.length / pageSize)
  );

  // Reset page when stock tab changes
  useEffect(() => {
    setPage(1);
  }, [stockTab, pageSize, unitFilter]);

  // Per-unit pies for "All Units" are built from the material rows (already
  // sorted by stock within each unit) so KG, LTR and NOS never merge.
  const topByUnit = useMemo<Record<DisplayUnit, InventoryMaterial[]>>(() => {
    const grouped: Record<DisplayUnit, InventoryMaterial[]> = {
      KG: [],
      LITRE: [],
      NOS: [],
    };

    for (const material of materials) {
      if (material.currentStock <= 0) continue;
      grouped[material.unit].push(material);
    }

    for (const unit of DISPLAY_UNITS) {
      grouped[unit] = grouped[unit].slice(0, 6);
    }

    return grouped;
  }, [materials]);

  const selectedUnitTopMaterials = useMemo(
    () =>
      topMaterials
        .filter((material) => material.quantity > 0)
        .slice(0, 6)
        .map((material) => ({
          materialName: material.materialName,
          quantity: material.quantity,
        })),
    [topMaterials]
  );

  const trendData = useMemo(() => {
    if (unitFilter !== 'All Units') return trend;

    return trend.map((item) => ({
      month: item.month,
      inwardKG: item.byUnit?.KG.inward ?? 0,
      outwardKG: item.byUnit?.KG.outward ?? 0,
      inwardLITRE: item.byUnit?.LITRE.inward ?? 0,
      outwardLITRE: item.byUnit?.LITRE.outward ?? 0,
      inwardNOS: item.byUnit?.NOS.inward ?? 0,
      outwardNOS: item.byUnit?.NOS.outward ?? 0,
    }));
  }, [trend, unitFilter]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Header
          title="Inventory Dashboard"
          description="Monitor inward, outward, and current material stock"
          icon="📦"
        />

        <UnitFilterSelect
          value={unitFilter}
          onChange={setUnitFilter}
          className="sm:pt-2"
        />
      </div>

      {/* KPI CARDS - unit-wise values */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <h4 className="text-sm font-medium text-gray-600">Total Inward</h4>
          <UnitWiseValue
            values={
              byUnitValues
                ? {
                    KG: byUnitValues.KG.inward,
                    LITRE: byUnitValues.LITRE.inward,
                    NOS: byUnitValues.NOS.inward,
                  }
                : undefined
            }
            activeUnit={unitFilter}
            loading={summaryLoading}
            valueClassName="text-blue-600"
          />
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Total Outward</h4>
          <UnitWiseValue
            values={
              byUnitValues
                ? {
                    KG: byUnitValues.KG.outward,
                    LITRE: byUnitValues.LITRE.outward,
                    NOS: byUnitValues.NOS.outward,
                  }
                : undefined
            }
            activeUnit={unitFilter}
            loading={summaryLoading}
            valueClassName="text-orange-600"
          />
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Current Stock</h4>
          <UnitWiseValue
            values={
              byUnitValues
                ? {
                    KG: byUnitValues.KG.currentStock,
                    LITRE: byUnitValues.LITRE.currentStock,
                    NOS: byUnitValues.NOS.currentStock,
                  }
                : undefined
            }
            activeUnit={unitFilter}
            loading={summaryLoading}
            valueClassName="text-green-600"
          />
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Total Materials</h4>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-gray-900">
              {summaryLoading ? '...' : summary?.totalMaterials ?? 0}
            </span>
            <span className="text-xs text-gray-500">Total</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-green-600">
              {summaryLoading ? '...' : summary?.materialsInStock ?? 0}
            </span>
            <span className="text-xs text-gray-500">Available in Stock</span>
          </div>

          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="font-semibold text-red-600">
              {summaryLoading ? '...' : summary?.materialsExpired ?? 0}
            </span>
            <span className="text-xs text-gray-500">Material Expired</span>
          </div>
        </Card>
      </div>

      {/* ANALYTICS */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">
            Inward vs Outward Trend
            {unitFilter !== 'All Units' && (
              <span className="ml-2 text-xs font-medium text-gray-500">
                ({UNIT_LABELS[unitFilter]})
              </span>
            )}
          </h3>

          {trendLoading || !filterReady ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              Loading chart...
            </div>
          ) : trend.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              No inventory movement data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Legend />

                {unitFilter === 'All Units' ? (
                  <>
                    <Bar dataKey="inwardKG" name="Inward KG" fill="#2563eb" />
                    <Bar
                      dataKey="outwardKG"
                      name="Outward KG"
                      fill="#93c5fd"
                    />
                    <Bar
                      dataKey="inwardLITRE"
                      name="Inward LTR"
                      fill="#ea580c"
                    />
                    <Bar
                      dataKey="outwardLITRE"
                      name="Outward LTR"
                      fill="#fdba74"
                    />
                    <Bar dataKey="inwardNOS" name="Inward NOS" fill="#16a34a" />
                    <Bar
                      dataKey="outwardNOS"
                      name="Outward NOS"
                      fill="#86efac"
                    />
                  </>
                ) : (
                  <>
                    <Bar dataKey="inward" name="Inward" fill="#3b82f6" />
                    <Bar dataKey="outward" name="Outward" fill="#f97316" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">
            Top Materials by Current Stock
            {unitFilter !== 'All Units' && (
              <span className="ml-2 text-xs font-medium text-gray-500">
                ({UNIT_LABELS[unitFilter]})
              </span>
            )}
          </h3>

          {topMaterialsLoading || !filterReady ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              Loading chart...
            </div>
          ) : unitFilter === 'All Units' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {DISPLAY_UNITS.map((unit) => (
                <UnitPie
                  key={unit}
                  title={`${UNIT_LABELS[unit]} Stock`}
                  data={topByUnit[unit].map((material) => ({
                    materialName: material.materialName,
                    quantity: material.currentStock,
                  }))}
                />
              ))}
            </div>
          ) : selectedUnitTopMaterials.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              No stock available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={selectedUnitTopMaterials}
                  dataKey="quantity"
                  nameKey="materialName"
                  outerRadius={90}
                  label={(entry) => `${entry.materialName}`}
                >
                  {selectedUnitTopMaterials.map((entry, index) => (
                    <Cell
                      key={entry.materialName}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatNumber(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* MATERIAL INVENTORY STATUS */}
      <div className="mt-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Material Inventory Status
            </h2>
            <p className="text-sm text-gray-500">
              {stockTab === 'active'
                ? 'Top 10 active materials by available stock'
                : 'Top 10 fully expired materials'}
              {unitFilter === 'All Units'
                ? ''
                : ` for ${UNIT_LABELS[unitFilter]}`}
            </p>
          </div>

          <Button variant="outline" asChild>
            <Link
              href={
                unitFilter === 'All Units'
                  ? '/inventory/materials'
                  : `/inventory/materials?unit=${unitFilter}`
              }
            >
              View All
            </Link>
          </Button>
        </div>

        {/* Active / Expired Tabs */}
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setStockTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              stockTab === 'active'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Active Stock
          </button>
          <button
            onClick={() => setStockTab('expired')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              stockTab === 'expired'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Expired Stock
          </button>
        </div>

        <MaterialInventoryTable
          materials={
            stockTab === 'active' ? activeMaterials : expiredMaterials
          }
          loading={materialsLoading || !filterReady}
          emptyMessage={
            stockTab === 'active'
              ? `No active materials found${
                  unitFilter === 'All Units'
                    ? ''
                    : ` for ${UNIT_LABELS[unitFilter]}`
                }.`
              : `No expired materials found${
                  unitFilter === 'All Units'
                    ? ''
                    : ` for ${UNIT_LABELS[unitFilter]}`
                }.`
          }
        />

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-medium">
              {stockTab === 'active' ? activeAllMaterials.length === 0 ? 0 : (page - 1) * pageSize + 1 : expiredAllMaterials.length === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {stockTab === 'active' ? Math.min(page * pageSize, activeAllMaterials.length) : Math.min(page * pageSize, expiredAllMaterials.length)}
            </span>{' '}
            of{' '}
            <span className="font-medium">
              {stockTab === 'active' ? activeAllMaterials.length : expiredAllMaterials.length}
            </span> records
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Records per page:</label>
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            {Array.from({
              length:
                stockTab === 'active' ? activeTotalPages : expiredTotalPages,
            }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={
                page ===
                (stockTab === 'active' ? activeTotalPages : expiredTotalPages) ||
                (stockTab === 'active' ? activeTotalPages : expiredTotalPages) ===
                  0
              }
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {unitFilter === 'All Units'
          ? 'Charts and the material table are separated by unit and never combine KG, LTR and NOS quantities.'
          : `Showing ${UNIT_LABELS[unitFilter]} data only. KPI cards still display all units; non-selected units are faded.`}
      </p>
    </PageContainer>
  );
}
