'use client';

import api from '@/lib/api';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Trash2, QrCode } from 'lucide-react';

import { Card, Header, PageContainer, Section } from '@/components/global';
import { Button } from '@/components/ui/button';
import { StatsGrid } from '@/components/global';
import { KpiCard } from '@/components/ui/kpi-card';
import ProductionScanModal from './components/ProductionScanModal';
import ScanQrModal from './components/ScanQrModal';
import OutwardDetailsModal from './components/OutwardDetailsModal';
import {
  useOutwardAnalytics,
  useOutwardData,
  useDeleteOutward,
} from '@/hooks/useOutwards';
import { useScannerListener } from '@/hooks/useScannerListener';
import FilterBar from '@/components/ui/filter-bar';
import { DataTableShell } from '@/components/ui/datatable-shell';
import { Outward } from '@/types/outward';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useRequisitionList,
  useApproveRequisition,
  useRejectRequisition,
} from '@/hooks/useRequisition';

export default function OutwardPage() {
  const { data = [], isLoading } = useOutwardData();
  const { mutate: deleteOutward } = useDeleteOutward();

  const { data: requisitions = [], isLoading: requisitionLoading } =
    useRequisitionList({ status: 'Pending' });

  const approveMutation = useApproveRequisition();
  const rejectMutation = useRejectRequisition();

  const [scanOpen, setScanOpen] = useState(false);
  const [scanQrOpen, setScanQrOpen] = useState(false);
  const [scanOutwardId, setScanOutwardId] = useState<number | null>(null);

  const [selectedEntry, setSelectedEntry] = useState<Outward | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Outward | null>(null);

  // Handle scanned QR from global listener
  const handleScanDetected = useCallback(
    async (qrId: string) => {
      console.log('\n========== OUTWARD PAGE DETECTED SCAN ==========');
      console.log('📱 Scanned QR ID:', qrId);
      console.log('⏱️  Processing started:', new Date().toISOString());
      console.log('📋 Current outward data available:', data.length);

      try {
        // Step 1: Fetch QR details from database
        console.log('\n📡 Step 1: Fetching QR details from database...');
        console.log('🔗 API URL: /inward/qr/' + qrId);

        let qrData;
        try {
          const qrResponse = await api.get(`/inward/qr/${qrId}`);
          qrData = qrResponse.data;
          console.log('✅ API Response received');
        } catch (apiError: any) {
          console.error('❌ API Error when fetching QR:', {
            status: apiError.response?.status,
            message: apiError.response?.data?.message,
            fullError: apiError.message,
          });
          throw apiError;
        }

        console.log('✅ QR Details Retrieved:', {
          qrId: qrData?.qrId,
          state: qrData?.state,
          inwardId: qrData?.inwardId,
          material: qrData?.inward?.materialName,
          supplier: qrData?.inward?.supplierName,
          bagWeight: qrData?.inward?.bagWeight,
          unit: qrData?.inward?.unit,
        });

        // Step 2: Validate QR state
        console.log('\n🔍 Step 2: Validating QR state...');
        if (qrData.state !== 'CREATED') {
          console.error('❌ Invalid QR state:', qrData.state);
          console.log('⚠️  QR State Details:', {
            current: qrData.state,
            expected: 'CREATED',
            reason:
              qrData.state === 'ISSUED'
                ? 'QR already scanned for outward'
                : 'QR already used in production',
          });
          return;
        }
        console.log('✅ QR state valid:', qrData.state);

        // Step 3: Fetch all outward entries to find matches
        console.log('\n📊 Step 3: Fetching all outward entries...');
        console.log('📋 Local data count:', data.length);

        let outwardEntries = data;

        // Always fetch fresh data from API to ensure we have latest outward entries
        console.log('🔄 Fetching fresh outward data from API...');
        try {
          const outwardResponse = await api.get('/outward');
          outwardEntries = outwardResponse.data || [];
          console.log(
            `✅ Fetched ${outwardEntries.length} outward entries from API`
          );

          if (outwardEntries.length > 0) {
            console.log('📋 Available outward entries:');
            outwardEntries.forEach((o: any) => {
              console.log(
                `   #${o.id}: ${o.materialName} | Status: ${o.status}`
              );
            });
          } else {
            console.warn('⚠️  API returned empty outward list');
          }
        } catch (apiError) {
          console.warn('⚠️  API fetch failed, using local data:', apiError);
          outwardEntries = data;
        }

        if (outwardEntries.length === 0) {
          console.error(
            '❌ No outward entries available (both API and local empty)'
          );
          return;
        }

        console.log(
          `\n📊 Step 4: Matching QR with available outward entries (${outwardEntries.length} total)...`
        );
        console.log('Looking for outward entries with material:', {
          material: qrData.inward.materialName,
          supplier: qrData.inward.supplierName,
          bagWeight: qrData.inward.bagWeight,
          unit: qrData.inward.unit,
        });

        // Find matching outward entries by material
        const matchingOutwards = outwardEntries.filter((outward) => {
          // Check if material name matches
          const materialMatch =
            outward.materialName === qrData.inward.materialName;

          console.log(`  - Outward #${outward.id}: ${outward.materialName}`, {
            match: materialMatch,
            status: outward.status,
            scanned: outward.qrScanStatus?.scannedBags || 0,
            total: outward.qrScanStatus?.totalBags || 0,
          });

          return materialMatch;
        });

        if (matchingOutwards.length === 0) {
          console.error(
            '❌ No matching outward entries found for this material'
          );
          console.log('🔴 Looking for material:', qrData.inward.materialName);
          console.log('📋 All available outwards:');
          outwardEntries.forEach((o: any) => {
            console.log(
              `   #${o.id}: ${o.materialName} (Match: ${
                o.materialName === qrData.inward.materialName
              })`
            );
          });
          return;
        }

        console.log(
          `\n✅ Found ${matchingOutwards.length} matching outward entries:`
        );
        matchingOutwards.forEach((outward) => {
          console.log(
            `  📦 Outward #${outward.id}: ${outward.materialName} | Status: ${
              outward.status
            } | Scanned: ${outward.qrScanStatus?.scannedBags || 0}/${
              outward.qrScanStatus?.totalBags || 0
            }`
          );
        });

        // Step 5: Suggest which outward to use
        console.log('\n🎯 Step 5: Determining best outward match...');

        // Priority: Pending status with same material
        let targetOutward = matchingOutwards.find(
          (o) => o.status === 'Pending'
        );

        if (!targetOutward) {
          console.warn('⚠️  No pending outward found, using first match');
          targetOutward = matchingOutwards[0];
        }

        if (targetOutward) {
          console.log('✅ MATCHED OUTWARD ENTRY:', {
            id: targetOutward.id,
            material: targetOutward.materialName,
            status: targetOutward.status,
            scanned: targetOutward.qrScanStatus?.scannedBags || 0,
            total: targetOutward.qrScanStatus?.totalBags || 0,
          });

          console.log('\n🔐 VALIDATION SUMMARY:');
          console.log('✅ QR State: CREATED (valid for outward)');
          console.log(
            `✅ Material Match: ${qrData.inward.materialName} = ${targetOutward.materialName}`
          );
          console.log(
            `✅ Outward Status: ${targetOutward.status} (can accept scans)`
          );
          console.log(`✅ Supplier: ${qrData.inward.supplierName}`);
          console.log(
            `✅ Bag Weight: ${qrData.inward.bagWeight} ${qrData.inward.unit}`
          );

          console.log('\n🚀 READY TO PROCESS:');
          console.log(`  QR: ${qrId}`);
          console.log(`  → Outward Entry #${targetOutward.id}`);
          console.log(
            `  → Progress: ${targetOutward.qrScanStatus?.scannedBags || 0} of ${
              targetOutward.qrScanStatus?.totalBags || 0
            } bags`
          );
        }
      } catch (error: unknown) {
        console.error('\n❌ CATCH BLOCK - ERROR Processing QR:', error);

        const err = error as any;
        console.error('🔴 Error Details:', {
          hasResponse: !!err.response,
          status: err.response?.status,
          statusText: err.response?.statusText,
          message: err.message,
          data: err.response?.data,
        });

        if (err.response?.status === 404) {
          console.error(
            '🔴 QR not found in database - Wrong QR ID or not in system:',
            qrId
          );
        } else if (err.response?.status === 400) {
          console.error('🔴 Bad request:', err.response?.data?.message);
        } else if (err.message === 'Network Error' || !err.response) {
          console.error('🔴 Network error - Backend might not be running');
          console.error(
            '   Check: Is "npm run start:dev" running in api/ folder?'
          );
        } else {
          console.error(
            '🔴 Unexpected error:',
            err.response?.data || err.message
          );
        }
      }

      console.log('========== END QR VALIDATION ==========\n');
    },
    [data]
  );

  // Enable scanner listener on this page
  useScannerListener(handleScanDetected, true);

  const stats = useOutwardAnalytics().data || {
    total: 0,
    pending: 0,
    completed: 0,
  };

  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    sort: 'desc',
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pageSizeOptions = [10, 25, 50];

  const filteredData = useMemo(() => {
    let result = [...data];

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.outwardNumber?.toLowerCase().includes(q) ||
          r.materialName?.toLowerCase().includes(q) ||
          false
      );
    }

    if (filters.status !== 'All') {
      result = result.filter((r) => r.status === filters.status);
    }

    // Apply sorting
    result.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return filters.sort === 'asc' ? ta - tb : tb - ta;
    });

    return result;
  }, [data, filters]);

  // Reset page when filters or pageSize change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.sort, pageSize]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  return (
    <PageContainer>
      <Header
        title="Outward Materials"
        description="Track and manage material dispatches from production"
        icon="📤"
      />

      {/* KPI cards */}
      <div className="mt-8">
        <StatsGrid columns={3}>
          <KpiCard title="Total Outwards" value={stats.total} gradient="blue" />
          <KpiCard
            title="Pending Issues"
            value={stats.pending}
            gradient="pink"
          />
          <KpiCard title="Completed" value={stats.completed} gradient="green" />
        </StatsGrid>
      </div>

      {/* Requisition Approval Section */}
      <Section
        title="Pending Requisitions for Approval"
        description="Review and approve or reject pending requisition requests"
        className="mt-8"
      >
        <Card noPadding>
          {requisitionLoading ? (
            <div className="p-6 flex items-center justify-center">
              <p className="text-sm text-gray-500">Loading requisitions...</p>
            </div>
          ) : requisitions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No pending requisitions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-700 text-xs font-semibold uppercase bg-gray-50">
                    <th className="px-4 py-3">Requisition No.</th>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Requested At</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {r.requisitionNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.materialName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.supplierName ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.requiredQuantity} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.requestedBy || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(r.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const reason = window.prompt(
                              'Rejection reason (optional):'
                            );
                            if (reason != null && reason !== undefined) {
                              rejectMutation.mutate({
                                id: r.id,
                                reason: reason as string,
                              });
                            }
                          }}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>

      {/* Outward Entries Table */}
      <Section
        title="Outwards Entry list"
        description="View and manage all outward materials"
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
              statusOptions={['All', 'Pending', 'Completed']}
            />
          </div>

              <div className="overflow-x-auto">
                <DataTableShell<Outward>
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
                  header: 'Name',
                  render: (r) => (
                    <div className="font-medium text-gray-900">
                      {r.materialName || '-'}
                    </div>
                  ),
                },
                {
                  key: 'quantity',
                  header: 'Total quantity',
                  render: (r) => (
                    <span className="text-gray-600">{r.quantity || 0}</span>
                  ),
                },
                {
                  key: 'numberOfBags',
                  header: 'Bags',
                  render: (r) => {
                    const scanned = r.qrScanStatus?.scannedBags || 0;
                    const total = r.qrScanStatus?.totalBags || 0;
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">
                          {scanned}/{total}
                        </span>
                        {scanned > 0 && total > 0 && (
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                scanned >= total
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{
                                width: `${(scanned / total) * 100}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'createdAt',
                  header: 'Created Date',
                  render: (r) => (
                    <span className="text-gray-600">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : '-'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        r.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {r.status || '-'}
                    </span>
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
                        disabled={!r.canScan}
                        onClick={(e) => {
                          e.stopPropagation();

                          if (!r.canScan) return;

                          setScanOutwardId(r.id);
                          setScanQrOpen(true);
                        }}
                        className="border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          r.canScan
                            ? 'Scan QR'
                            : 'All bags have already been scanned'
                        }
                      >
                        <QrCode className="w-4 h-4 text-blue-600" />
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
                            : 'Cannot delete after dispatch has started'
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

      {/* Delete Confirmation Modal */}
      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-lg border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-lg font-semibold">
              Delete Outward Entry
            </DialogTitle>
          </DialogHeader>

          <p className="text-gray-600 text-sm">
            Are you sure you want to delete this outward entry?
            {entryToDelete && (
              <>
                <br />
                <br />
                <strong>
                  {entryToDelete.outwardNumber || `#${entryToDelete.id}`}
                </strong>{' '}
                with <strong>{entryToDelete.items?.length || 0} items</strong>
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
                  deleteOutward(entryToDelete.id);
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
      <ProductionScanModal open={scanOpen} onClose={() => setScanOpen(false)} />

      {/* Scan QR modal for individual outward entries */}
      {scanOutwardId !== null && (
        <ScanQrModal
          open={scanQrOpen}
          onClose={(v) => {
            setScanQrOpen(v);
            if (!v) setScanOutwardId(null);
          }}
          outwardId={scanOutwardId}
        />
      )}

      {/* Outward details modal */}
      <OutwardDetailsModal
        open={openDetails}
        onClose={() => {
          setOpenDetails(false);
          setSelectedEntry(null);
        }}
        item={selectedEntry}
      />
    </PageContainer>
  );
}
