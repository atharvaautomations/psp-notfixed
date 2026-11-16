'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Inward } from '@/types/inward';
import { useInwardData } from '@/hooks/useInward';
import { useDeleteInward } from '@/hooks/useInward';

import FilterBar from '@/components/ui/filter-bar';
import QrPreviewModal from './components/QrPreviewModal';
import EditInwardDrawer from './components/EditInwardDrawer';
import InwardDetailsModal from './components/InwardDetailsModal';
import { StatusBadge } from '@/components/ui/status-badge';

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Pencil, Trash2, QrCode } from 'lucide-react';
import {
  Header,
  PageContainer,
  Section,
  Card,
} from '@/components/global';
import { DataTableShell } from '@/components/ui/datatable-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { UnitFilterSelect } from '@/app/(dashboard)/inventory/components/UnitFilterSelect';
import {
  DisplayUnit,
  UnitFilter,
  UNIT_LABELS,
  parseUnitFilter,
} from '@/hooks/useInventory';

const DISPLAY_UNITS: DisplayUnit[] = ['KG', 'LITRE', 'NOS'];

export default function InwardPage() {
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('All Units');
  const [filterReady, setFilterReady] = useState(false);

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

  const { data: rawData, isLoading, isError } = useInwardData({
    unit: unitFilter,
  });
  const data = Array.isArray(rawData) ? rawData : [];
  const { mutate: deleteInward } = useDeleteInward();

  const [selectedEntry, setSelectedEntry] = useState<Inward | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openQR, setOpenQR] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Inward | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    sort: 'desc',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50];

  const filteredData = useMemo(() => {
    let result = [...data];

    // Unit filter
    if (unitFilter !== 'All Units') {
      result = result.filter((item) => item.unit === unitFilter);
    }

    // Search filter
    if (filters.search.trim()) {
      result = result.filter((item) =>
        item.materialName.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status !== 'All') {
      result = result.filter((item) => {
        return (item.isExpired ? 'Expired' : 'Active') === filters.status;
      });
    }

    if (filters.sort) {
      result.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return filters.sort === 'asc' ? ta - tb : tb - ta;
      });
    }

    return result;
  }, [data, filters, unitFilter]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.sort, pageSize, unitFilter]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // Unit-only filtered data for charts (search/status/sort don't apply to charts)
  const unitFilteredData = useMemo(() => {
    if (unitFilter === 'All Units') return data;
    return data.filter((item) => item.unit === unitFilter);
  }, [data, unitFilter]);

  const { stats, supplierChartData, materialChartData } =
    useMemo(() => {
      const now = new Date();

      const currentStart = new Date();
      currentStart.setDate(now.getDate() - 30);

      const previousStart = new Date();
      previousStart.setDate(now.getDate() - 60);

      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) {
          return { value: 100, positive: true };
        }

        const diff = ((current - previous) / previous) * 100;
        return {
          value: Math.abs(Number(diff.toFixed(1))),
          positive: diff >= 0,
        };
      };

      const currentPeriod = unitFilteredData.filter(
        (d) => d.createdAt && new Date(d.createdAt) >= currentStart
      );

      const previousPeriod = unitFilteredData.filter(
        (d) =>
          d.createdAt &&
          new Date(d.createdAt) >= previousStart &&
          new Date(d.createdAt) < currentStart
      );

      const perUnit = DISPLAY_UNITS.reduce<Record<string, { total: number; active: number; expired: number; quantity: number }>>(
        (acc, unit) => {
          const unitData = unitFilteredData.filter((d) => d.unit === unit);

          acc[unit] = {
            total: unitData.length,
            active: unitData.filter((d) => !d.isExpired).length,
            expired: unitData.filter((d) => d.isExpired).length,
            quantity: unitData.reduce((sum, d) => sum + (d.quantity ?? 0), 0),
          };
          return acc;
        },
        {} as Record<string, { total: number; active: number; expired: number; quantity: number }>
      );

      const total = unitFilteredData.length;
      const expired = unitFilteredData.filter((d) => d.isExpired).length;
      const active = total - expired;

      const totalQuantity = data.reduce(
        (sum, d) => sum + (d.quantity ?? 0),
        0
      );

      const currentActive = currentPeriod.filter((d) => !d.isExpired).length;
      const previousActive = previousPeriod.filter((d) => !d.isExpired).length;
      const currentExpired = currentPeriod.filter((d) => d.isExpired).length;
      const previousExpired = previousPeriod.filter((d) => d.isExpired).length;

      const currentTotalQty = currentPeriod.reduce(
        (sum, d) => sum + (d.quantity ?? 0),
        0
      );

      const previousTotalQty = previousPeriod.reduce(
        (sum, d) => sum + (d.quantity ?? 0),
        0
      );

      const supplierMap = new Map<string, number>();
      unitFilteredData.forEach((d) => {
        if (!d.supplierName) return;
        supplierMap.set(
          d.supplierName,
          (supplierMap.get(d.supplierName) || 0) + (d.quantity ?? 0)
        );
      });

      const supplierChartData = Array.from(supplierMap.entries())
        .map(([name, quantity]) => ({
          name: (name || 'Unknown').length > 15 ? (name || 'Unknown').slice(0, 12) + '...' : (name || 'Unknown'),
          quantity: Math.round(quantity * 100) / 100,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const stringToColor = (str: string) => {
        if (!str) return '#94a3b8';
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash) % 360;

        return `hsl(${hue}, 70%, 50%)`;
      };

      const materialMap = new Map<string, number>();
      unitFilteredData.forEach((d) => {
        if (!d.materialName) return;
        materialMap.set(
          d.materialName,
          (materialMap.get(d.materialName) || 0) + (d.quantity ?? 0)
        );
      });

      const materialChartData = Array.from(materialMap.entries())
        .map(([name, quantity]) => ({
          name,
          value: Math.round(quantity * 100) / 100,
          fill: stringToColor(name),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return {
        stats: {
          total,
          active,
          expired,
          totalQuantity,
          perUnit,
        },
        trends: {
          total: calculateTrend(currentPeriod.length, previousPeriod.length),
          active: calculateTrend(currentActive, previousActive),
          expired: calculateTrend(currentExpired, previousExpired),
          quantity: calculateTrend(currentTotalQty, previousTotalQty),
        },
        supplierChartData,
        materialChartData,
      };
    }, [unitFilteredData]);

  if (isLoading) {
    return (
      <PageContainer>
        <Header
          title="Inward Material Management"
          description="Track incoming materials, monitor inventory, and manage suppliers"
          icon="📦"
        />
        <div className="mt-8 flex items-center justify-center h-96">
          <p className="text-sm text-gray-500">Loading inward entries...</p>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <Header
          title="Inward Material Management"
          description="Track incoming materials, monitor inventory, and manage suppliers"
          icon="📦"
        />
        <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-red-600">
            Failed to load inward entries. Please refresh the page.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Refresh
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header with Unit Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Header
          title="Inward Material Management"
          description="Track incoming materials, monitor inventory, and manage suppliers"
          icon="📦"
        />

        <UnitFilterSelect
          value={unitFilter}
          onChange={setUnitFilter}
          className="sm:pt-2"
        />
      </div>

      {/* KPI Cards - per-unit values */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <h4 className="text-sm font-medium text-gray-600">Total Materials</h4>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {DISPLAY_UNITS.map((unit) => {
              const show = unitFilter === 'All Units' || unitFilter === unit;
              const value = show ? stats.perUnit[unit].total : '-';
              return (
                <span key={unit} className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-blue-600">
                    {value}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    {UNIT_LABELS[unit]}
                  </span>
                </span>
              );
            })}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Active Items</h4>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {DISPLAY_UNITS.map((unit) => {
              const show = unitFilter === 'All Units' || unitFilter === unit;
              const value = show ? stats.perUnit[unit].active : '-';
              return (
                <span key={unit} className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-cyan-600">
                    {value}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    {UNIT_LABELS[unit]}
                  </span>
                </span>
              );
            })}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Expired</h4>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {DISPLAY_UNITS.map((unit) => {
              const show = unitFilter === 'All Units' || unitFilter === unit;
              const value = show ? stats.perUnit[unit].expired : '-';
              return (
                <span key={unit} className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-pink-600">
                    {value}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    {UNIT_LABELS[unit]}
                  </span>
                </span>
              );
            })}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-medium text-gray-600">Total Quantity</h4>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {DISPLAY_UNITS.map((unit) => {
              const show = unitFilter === 'All Units' || unitFilter === unit;
              const value = show
                ? stats.perUnit[unit].quantity.toFixed(1)
                : '-';
              return (
                <span key={unit} className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-purple-600">
                    {value}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    {UNIT_LABELS[unit]}
                  </span>
                </span>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Top Action Bar */}
      <div className="mt-8 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Materials Overview
          </h2>
          <p className="text-gray-600 text-sm">
            Top suppliers and inventory status
          </p>
        </div>
        <Link href="/inward/add">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            + Add Material
          </Button>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers Bar Chart */}
        <Card>
          <div className="pb-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Top Suppliers by Quantity
              {unitFilter !== 'All Units' && (
                <span className="ml-2 text-xs font-medium text-gray-500">
                  ({UNIT_LABELS[unitFilter]})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              Received quantity from suppliers
            </p>
          </div>
          <div className="h-80 pt-4">
            {supplierChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => `${value} ${unitFilter === 'All Units' ? 'units' : UNIT_LABELS[unitFilter]}`}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No supplier data available
              </div>
            )}
          </div>
        </Card>

        {/* Pie Chart - Material Quantity */}
        <Card>
          <div className="pb-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Total Material Quantity
              {unitFilter !== 'All Units' && (
                <span className="ml-2 text-xs font-medium text-gray-500">
                  ({UNIT_LABELS[unitFilter]})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              Inventory distribution by material type
            </p>
          </div>
          <div className="h-80 pt-4">
            {materialChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={materialChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                  >
                    {materialChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value) => `${value} ${unitFilter === 'All Units' ? 'units' : UNIT_LABELS[unitFilter]}`} />

                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value, entry: any) =>
                      `${value} (${entry.payload.value}${unitFilter === 'All Units' ? ' units' : UNIT_LABELS[unitFilter]})`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No inventory data available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Filter & Table Section */}
      <Section
        title="Materials Entry List"
        description="View and manage all incoming materials"
        className="mt-8"
      >
        <Card noPadding>
          <div className="p-6 border-b border-gray-200">
            <FilterBar
              filters={filters}
              setFilters={(updater) => {
                const updated = updater(filters);
                setFilters({
                  search: updated.search ?? '',
                  status: updated.status ?? 'All',
                  sort: updated.sort ?? 'desc',
                });
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <DataTableShell<Inward>
              loading={isLoading}
              data={paginatedData}
              onRowClick={(row) => {
                setSelectedEntry(row);
                setOpenDetails(true);
              }}
              columns={[
                {
                  key: 'id',
                  header: 'ID',
                  render: (r) => (
                    <div className="font-semibold text-gray-900">{r.id}</div>
                  ),
                },
                {
                  key: 'materialName',
                  header: 'Material',
                  render: (r) => (
                    <div className="font-medium text-gray-900">
                      {r.materialName}
                    </div>
                  ),
                },
                {
                  key: 'supplierName',
                  header: 'Supplier',
                  render: (r) => (
                    <span className="text-gray-600">{r.supplierName}</span>
                  ),
                },
                {
                  key: 'quantity',
                  header: 'Quantity',
                  render: (r) => (
                    <span className="font-semibold text-gray-900">
                      {r.quantity ?? 0} {r.unit}
                    </span>
                  ),
                },
                {
                  key: 'bags',
                  header: 'Bags',
                  render: (r) => {
                    if (!r.quantity || !r.bagWeight) {
                      return (
                        <span className="text-center text-gray-900">
                          {r.storedAsWhole ? 1 : 0}
                        </span>
                      );
                    }
                    return (
                      <span className="text-center text-gray-900">
                        {r.storedAsWhole
                          ? 1
                          : Math.ceil(r.quantity / r.bagWeight)}
                      </span>
                    );
                  },
                },
                {
                  key: 'createdAt',
                  header: 'Entry Date',
                  render: (r) => (
                    <span className="text-gray-600">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : '-'}
                    </span>
                  ),
                },
                {
                  key: 'expDate',
                  header: 'Exp. Date',
                  render: (r) => (
                    <span
                      className={
                        r.isExpired
                          ? 'text-red-600 font-medium'
                          : 'text-gray-600'
                      }
                    >
                      {new Date(r.expDate).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <StatusBadge status={r.isExpired ? 'Expired' : 'Active'} />
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!r.canPrintQr}
                        onClick={(e) => {
                          e.stopPropagation();

                          if (!r.canPrintQr) return;

                          setSelectedEntry(r);
                          setOpenQR(true);
                        }}
                        className="border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          r.canPrintQr
                            ? 'Preview QR'
                            : 'QR cannot be printed for expired material'
                        }
                      >
                        <QrCode className="w-4 h-4 text-blue-600" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!r.canEdit}
                        onClick={(e) => {
                          e.stopPropagation();

                          if (!r.canEdit) return;

                          setSelectedEntry(r);
                          setOpenEdit(true);
                        }}
                        className="border-amber-200 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          r.canEdit
                            ? 'Edit Entry'
                            : 'Expired material cannot be edited'
                        }
                      >
                        <Pencil className="w-4 h-4 text-amber-600" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!r.canDelete}
                        onClick={(e) => {
                          e.stopPropagation();

                          if (!r.canDelete) return;

                          setEntryToDelete(r);
                          setOpenDeleteConfirm(true);
                        }}
                        className="border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          r.canDelete
                            ? 'Delete Entry'
                            : 'Material has already been issued'
                        }
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </Section>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          Showing{' '}
          <span className="font-medium">
            {filteredData.length === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{' '}
          to{' '}
          <span className="font-medium">
            {Math.min(page * pageSize, filteredData.length)}
          </span>{' '}
          of <span className="font-medium">{filteredData.length}</span> records
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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Details Modal */}
      <InwardDetailsModal
        open={openDetails}
        onClose={() => {
          setOpenDetails(false);
          setSelectedEntry(null);
        }}
        item={selectedEntry}
        onEdit={() => setOpenEdit(true)}
      />

      {/* Edit Drawer */}
      <EditInwardDrawer
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setSelectedEntry(null);
        }}
        item={selectedEntry}
      />

      {/* QR Preview Modal */}
      {selectedEntry && (
        <QrPreviewModal
          open={openQR}
          onClose={() => {
            setOpenQR(false);
            setSelectedEntry(null);
          }}
          inwardId={selectedEntry.id}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-lg border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-lg font-semibold">
              Delete Inward Entry
            </DialogTitle>
          </DialogHeader>

          <p className="text-gray-600 text-sm">
            Are you sure you want to delete this inward entry?
            {entryToDelete && (
              <>
                <br />
                <br />
                <strong>{entryToDelete.materialName}</strong> from{' '}
                <strong>{entryToDelete.supplierName}</strong> (
                {entryToDelete.quantity} {entryToDelete.unit})
              </>
            )}
          </p>

          <p className="text-gray-500 text-xs">This action cannot be undone.</p>

          <DialogFooter className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpenDeleteConfirm(false);
                setEntryToDelete(null);
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (entryToDelete) {
                  deleteInward(entryToDelete.id);
                  setOpenDeleteConfirm(false);
                  setEntryToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
