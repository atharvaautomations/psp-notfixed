'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X, RefreshCw, ArrowRight } from 'lucide-react';

import {
  Header,
  PageContainer,
  Card,
  Section,
  StatsGrid,
} from '@/components/global';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTableShell } from '@/components/ui/datatable-shell';
import FilterBar from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  useRequisitionList,
  useCreateRequisition,
  useDeleteRequisition,
  useFulfillRequisition,
} from '@/hooks/useRequisition';
import type {
  RequisitionItem,
  RequisitionFilters,
  UnitType,
} from '@/types/requisition';
import { toast } from '@/components/ui/use-toast';
import { useAvailableForOutward } from '@/hooks/useMaterialStock';

export default function RequisitionPage() {
  const { data: requisitions = [], isLoading } = useRequisitionList();
  const createMutation = useCreateRequisition();
  const deleteMutation = useDeleteRequisition();
  const fulfillMutation = useFulfillRequisition();

  const { data: availableInwardEntries = [], isLoading: loadingInward } =
    useAvailableForOutward();

  const [openCreate, setOpenCreate] = useState(false);
  const [formData, setFormData] = useState<{
    materialName: string;
    materialNumber: string;
    materialId: number | null;
    requiredQuantity: string;
    numberOfBags: string;
    unit: UnitType;
    bagWeight: string;
    sourceInwardId: number | null;
    availableBags: number;
    supplierName: string;
    batchNumber: string;
    notes: string;
  }>({
    materialName: '',
    materialNumber: '',
    materialId: null,
    requiredQuantity: '',
    numberOfBags: '',
    unit: 'KG',
    bagWeight: '',
    sourceInwardId: null,
    availableBags: 0,
    supplierName: '',
    batchNumber: '',
    notes: '',
  });

  const [filters, setFilters] = useState<RequisitionFilters>({
    search: '',
    status: 'All',
    sort: 'desc',
  });

  const filteredData = useMemo(() => {
    let result = [...requisitions];

    if (filters.search?.trim()) {
      const search = filters.search!.toLowerCase();
      result = result.filter((item) =>
        item.materialName.toLowerCase().includes(search)
      );
    }

    if (filters.status !== 'All') {
      result = result.filter((item) => item.status === filters.status);
    }

    if (filters.sort) {
      result.sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return filters.sort === 'asc' ? ta - tb : tb - ta;
      });
    }

    return result;
  }, [requisitions, filters]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50];

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.sort, pageSize]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    requisitions.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requisitions]);

  const handleCreate = () => {
    if (!formData.materialName.trim()) {
      toast({ title: 'Material name is required', variant: 'destructive' });
      return;
    }

    const qty = Number(formData.requiredQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast({ title: 'Valid quantity is required', variant: 'destructive' });
      return;
    }

    const numBags = Number(formData.numberOfBags);
    if (numBags && (!Number.isFinite(numBags) || numBags <= 0)) {
      toast({
        title: 'Valid number of bags is required',
        variant: 'destructive',
      });
      return;
    }

    if (numBags > formData.availableBags) {
      toast({
        title: 'Insufficient bags',
        description: `Requested ${numBags} bags but only ${formData.availableBags} available`,
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      materialName: formData.materialName.trim(),
      materialNumber: formData.materialNumber,
      supplierName: formData.supplierName.trim(),
      batchNumber: formData.batchNumber,
      requiredQuantity: qty,
      unit: formData.unit,
      numberOfBags: numBags || null,
      weightPerBag: Number(formData.bagWeight) || null,
      sourceInwardId: formData.sourceInwardId,
      notes: formData.notes.trim() || undefined,
    });

    setOpenCreate(false);
    setFormData({
      materialName: '',
      materialNumber: '',
      materialId: null,
      requiredQuantity: '',
      numberOfBags: '',
      unit: 'KG',
      bagWeight: '',
      sourceInwardId: null,
      availableBags: 0,
      supplierName: '',
      batchNumber: '',
      notes: '',
    });
  };

  const handleFulfill = (id: number) => {
    fulfillMutation.mutate(id);
  };

  const handleCreateOutwardFromRequisition = (id: number) => {
    toast({
      title: 'Create Outward',
      description: 'Redirecting to outward creation with requisition data',
    });
    window.location.href = `/outward/add?fromRequisition=${id}`;
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this requisition?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <PageContainer>
      <Header
        title="Material Requisition"
        description="Link inward materials to outward dispatch via requisition requests"
        icon="📋"
      />

      <StatsGrid columns={4}>
        <KpiCard
          title="Total Requisitions"
          value={requisitions.length}
          gradient="blue"
          icon="📋"
          trend={{ value: 0, positive: true }}
        />
        <KpiCard
          title="Pending"
          value={statusCounts['Pending'] || 0}
          gradient="blue"
          icon="⏳"
          trend={{ value: 0, positive: true }}
        />
        <KpiCard
          title="Approved"
          value={statusCounts['Approved'] || 0}
          gradient="blue"
          icon="✓"
          trend={{ value: 0, positive: true }}
        />
        <KpiCard
          title="Rejected"
          value={statusCounts['Rejected'] || 0}
          gradient="red"
          icon="✕"
          trend={{ value: 0, positive: true }}
        />
      </StatsGrid>

      <div className="mt-8 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Requisition Requests
          </h2>
          <p className="text-gray-600 text-sm">
            Create requisitions to link inward stock to outward dispatch
          </p>
        </div>
        <Button
          onClick={() => setOpenCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus size={16} />
          Create Requisition
        </Button>
      </div>

      {openCreate && (
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="sm:max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <DialogHeader>
              <DialogTitle>New Requisition</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Material Selection */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">
                  Material Entry
                </div>
                <Select
                  value={formData.sourceInwardId?.toString() || ''}
                  onValueChange={(v) => {
                    const id = v ? Number(v) : null;
                    setFormData((prev) => ({ ...prev, sourceInwardId: id }));
                    const entry = (availableInwardEntries as any[]).find(
                      (e) => e.id === id
                    );
                    if (entry) {
                      setFormData((prev) => ({
                        ...prev,
                        materialName: entry.materialName,
                        materialNumber: entry.materialNumber || '',
                        supplierName: entry.supplierName,
                        batchNumber: entry.batchNumber || '',
                        bagWeight: entry.bagWeight?.toString() || '',
                        unit: entry.unit || 'KG',
                        availableBags: entry._count.qrCodes || 0,
                      }));
                    }
                  }}
                  disabled={loadingInward}
                >
                  <SelectTrigger className="bg-white mt-1">
                    <SelectValue
                      placeholder={
                        loadingInward ? 'Loading...' : 'Select material entry'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-md max-h-64 overflow-y-auto">
                    {(availableInwardEntries as any[]).map(
                      (entry: {
                        id: number;
                        materialName: string;
                        supplierName: string;
                        bagWeight: number;
                        unit: string;
                        _count: { qrCodes: number };
                      }) => (
                        <SelectItem key={entry.id} value={entry.id.toString()}>
                          {entry.materialName} - {entry.supplierName} -{' '}
                          {entry.bagWeight}
                          {entry.unit} bags ({entry._count.qrCodes} available)
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {formData.sourceInwardId && formData.availableBags !== undefined && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium">
                      Available Bags: {formData.availableBags}
                    </p>
                    {formData.numberOfBags &&
                      Number(formData.numberOfBags) >
                        formData.availableBags && (
                      <p className="text-xs text-red-600 font-bold mt-1">
                        ⚠ Exceeds available bags! Max: {formData.availableBags}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Number of Bags */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">
                  Number of Bags
                </div>
                <Input
                  type="number"
                  min={1}
                  max={formData.availableBags || 0}
                  value={formData.numberOfBags}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numBags = Number(val);
                    const bagWeight = Number(formData.bagWeight || 0);
                    let calculatedQty = '';
                    if (numBags > 0 && bagWeight > 0) {
                      calculatedQty = (numBags * bagWeight).toString();
                    }
                    setFormData((prev) => ({
                      ...prev,
                      numberOfBags: val,
                      requiredQuantity: calculatedQty,
                    }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
                {formData.numberOfBags &&
                  Number(formData.numberOfBags) > 0 &&
                  formData.bagWeight && (
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated Quantity: {Number(formData.numberOfBags) * Number(formData.bagWeight)} {formData.unit}
                  </p>
                )}
                {formData.numberOfBags &&
                  Number(formData.numberOfBags) > formData.availableBags && (
                  <p className="text-xs text-red-600 mt-1">
                    Exceeds available bags ({formData.availableBags})
                  </p>
                )}
              </div>

              {/* Required Quantity (Read-only, calculated) */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">
                  Required Quantity ({formData.unit})
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.requiredQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredQuantity: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                  readOnly
                />
                {formData.requiredQuantity && (
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated from bags × weight per bag
                  </p>
                )}
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">
                  Unit
                </div>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                  value={formData.unit}
                  disabled
                >
                  <option value="KG">KG</option>
                  <option value="LITRE">LITRE</option>
                  <option value="NOS">NOS</option>
                </select>
              </div>

              {/* Bag Weight */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">
                  Weight Per Bag ({formData.unit})
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bagWeight}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                  readOnly
                />
                {formData.bagWeight && (
                  <p className="text-xs text-gray-500 mt-1">
                    Actual weight per bag from inward record
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="col-span-3 space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">
                  Notes
                </div>
                <textarea
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenCreate(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Requisition'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Section
        title="Requisition List"
        description="Track material requisitions from inward to outward"
        className="mt-8"
      >
        <Card noPadding>
          <div className="p-6 border-b border-gray-200">
            <FilterBar
              filters={filters as Record<string, string>}
              setFilters={(updater) => {
                const updated = updater(filters);
                setFilters({
                  search: updated.search ?? '',
                  status: (updated.status as RequisitionFilters['status']) ?? 'All',
                  sort: (updated.sort as RequisitionFilters['sort']) ?? 'desc',
                });
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <DataTableShell<RequisitionItem>
              loading={isLoading}
              data={paginatedData}
              columns={[
                {
                  key: 'requisitionNumber',
                  header: 'Requisition No.',
                  render: (r) => (
                    <div className="font-semibold text-gray-900">{r.requisitionNumber}</div>
                  ),
                },
                {
                  key: 'materialName',
                  header: 'Material',
                  render: (r) => (
                    <div className="font-medium text-gray-900">{r.materialName}</div>
                  ),
                },
                {
                  key: 'requiredQuantity',
                  header: 'Quantity',
                  render: (r) => (
                    <span className="text-gray-900">
                      {r.requiredQuantity} {r.unit}
                    </span>
                  ),
                },
                {
                  key: 'numberOfBags',
                  header: 'Bags',
                  render: (r) => (
                    <span className="text-gray-900">
                      {r.numberOfBags ?? '-'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        r.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : r.status === 'Approved'
                            ? 'bg-blue-100 text-blue-700'
                            : r.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : r.status === 'Fulfilled'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  ),
                },
                {
                  key: 'requestedBy',
                  header: 'Requested By',
                  render: (r) => (
                    <span className="text-gray-600">{r.requestedBy}</span>
                  ),
                },
                {
                  key: 'requestedAt',
                  header: 'Requested At',
                  render: (r) => (
                    <span className="text-gray-600 text-sm">
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) => (
                    <div className="flex gap-2">
                      {r.status === 'Pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(r.id)}
                      disabled={deleteMutation.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <X size={14} /> Cancel
                    </Button>
                  )}
                      {r.status === 'Approved' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFulfill(r.id)}
                            disabled={fulfillMutation.isPending}
                            className="border-green-200 text-green-600 hover:bg-green-50"
                          >
                            <RefreshCw size={14} /> Fulfill
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateOutwardFromRequisition(r.id)}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <ArrowRight size={14} /> Create Outward
                          </Button>
                        </>
                      )}
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

      {createMutation.isError && (
        <div className="mt-4 p-4 rounded bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">
            Failed to create requisition. Please try again.
          </p>
        </div>
      )}
    </PageContainer>
  );
}