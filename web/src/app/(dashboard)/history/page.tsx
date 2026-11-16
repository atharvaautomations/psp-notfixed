'use client';

import { useMemo, useState, useEffect } from 'react';

import {
  Header,
  PageContainer,
  Card,
  Section,
} from '@/components/global';
import { Button } from '@/components/ui/button';
import { DataTableShell } from '@/components/ui/datatable-shell';
import { Input } from '@/components/ui/input';
import { useHistory, useHistoryExport } from '@/hooks/useHistory';
import { binToDisplay } from '@/utils/bins/bin-mapping';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface HistoryEntry {
  id: number;
  moduleType: string;
  activityType: string;
  referenceId?: string | null;
  bagNumber?: number | null;
  qrId?: string | null;
  grnNumber?: string | null;
  binNumber?: string | null;
  userId?: number | null;
  username?: string | null;
  status: string;
  errorMessage?: string | null;
  metadata?: any;
  createdAt: string;
}

export default function HistoryPage() {
  const {
    data: history,
    isLoading,
  } = useHistory();
  const exportHistory = useHistoryExport();

  const [filters, setFilters] = useState({
    moduleType: 'All',
    activityType: '',
    status: 'All',
    search: '',
    fromDate: '',
    toDate: '',
    sort: 'desc',
    page: 1,
    limit: 50,
  });

  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  const [selectedLog, setSelectedLog] = useState<HistoryEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50];

  const logs = history?.logs ?? [];

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (filters.moduleType !== 'All') {
      result = result.filter((l) => l.moduleType === filters.moduleType);
    }

    if (filters.activityType) {
      result = result.filter((l) =>
        l.activityType.toLowerCase().includes(filters.activityType.toLowerCase())
      );
    }

    if (filters.status !== 'All') {
      result = result.filter((l) => l.status === filters.status);
    }

    if (filters.search?.trim()) {
      const s = filters.search!.toLowerCase();
      result = result.filter(
        (l) =>
          l.referenceId?.toLowerCase().includes(s) ||
          l.qrId?.toLowerCase().includes(s) ||
          l.grnNumber?.toLowerCase().includes(s) ||
          l.username?.toLowerCase().includes(s) ||
          l.errorMessage?.toLowerCase().includes(s) ||
          l.moduleType.toLowerCase().includes(s) ||
          l.activityType.toLowerCase().includes(s)
      );
    }

    if (filters.fromDate) {
      const from = new Date(filters.fromDate);
      result = result.filter((l) => new Date(l.createdAt) >= from);
    }

    if (filters.toDate) {
      const to = new Date(filters.toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((l) => new Date(l.createdAt) <= to);
    }

    // Apply sorting
    result.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return filters.sort === 'asc' ? ta - tb : tb - ta;
    });

    return result;
  }, [logs, filters]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.moduleType, filters.activityType, filters.status, filters.search, filters.fromDate, filters.toDate, filters.sort]);

  // Paginated data
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  const handleExport = async () => {
    try {
      const blob = await exportHistory();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `history-export.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Complete',
        description: `History exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error?.response?.data?.message || 'Failed to export',
        variant: 'destructive',
      });
    }
  };

  const moduleOptions = [
    { value: 'All', label: 'All Modules' },
    { value: 'inward', label: 'Inward' },
    { value: 'outward', label: 'Outward' },
    { value: 'requisition', label: 'Requisition' },
    { value: 'loading', label: 'Bin Loading' },
    { value: 'printer', label: 'Label Printing' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Success', label: 'Success' },
    { value: 'Failed', label: 'Failed' },
  ];

  if (isLoading) {
    return (
      <PageContainer>
        <Header
          title="History"
          description="Centralized audit log for all module activities"
          icon="📋"
        />
        <div className="mt-8 flex items-center justify-center h-96">
          <p className="text-sm text-gray-500">Loading history...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header
        title="History"
        description="Centralized audit log for inward, outward, and bin loading activities"
        icon="📋"
      />

      <div className="mt-8 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Module
          </label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            value={filters.moduleType}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                moduleType: e.target.value as any,
              }))
            }
          >
            {moduleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Activity
          </label>
          <Input
            value={filters.activityType}
            placeholder="e.g. entry_creation, printing, qr_scan..."
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, activityType: e.target.value }))
            }
            className="border-gray-300"
          />
        </div>

        <div className="flex flex-col flex-1 min-w-[160px]">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value as any }))
            }
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className="text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <Input
            type="date"
            value={filters.fromDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
            }
            className="border-gray-300"
          />
        </div>

        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className="text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <Input
            type="date"
            value={filters.toDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, toDate: e.target.value }))
            }
            className="border-gray-300"
          />
        </div>

        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <Input
            value={filters.search}
            placeholder="Search reference, QR, GRN, user..."
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="border-gray-300"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            Export
          </Button>
          <select
            className="border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            value={exportFormat}
            onChange={(e) =>
              setExportFormat(e.target.value as 'excel' | 'pdf')
            }
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
        </div>
      </div>

      <Section title="Activity Log" className="mt-8">
        <Card noPadding>
          <div className="overflow-x-auto">
            <DataTableShell<HistoryEntry>
              loading={isLoading}
              data={paginatedLogs}
              columns={[
                {
                  key: 'createdAt',
                  header: 'Date & Time',
                  render: (r) => (
                    <span className="text-gray-600 text-sm">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  ),
                },
                {
                  key: 'moduleType',
                  header: 'Module',
                  render: (r) => (
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        r.moduleType === 'inward'
                          ? 'bg-green-100 text-green-700'
                          : r.moduleType === 'outward'
                            ? 'bg-blue-100 text-blue-700'
                            : r.moduleType === 'printer'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.moduleType.charAt(0).toUpperCase() + r.moduleType.slice(1)}
                    </span>
                  ),
                },
                {
                  key: 'activityType',
                  header: 'Activity',
                  render: (r) => (
                    <span className="text-gray-900 text-sm">
                      {r.activityType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  ),
                },
                {
                  key: 'referenceId',
                  header: 'Reference ID',
                  render: (r) => (
                    <span className="text-gray-600 text-sm">
                      {r.referenceId || '-'}
                    </span>
                  ),
                },
                {
                  key: 'bagNumber',
                  header: 'Bag No.',
                  render: (r) => (
                    <span className="text-gray-600 text-sm">
                      {r.bagNumber ?? '-'}
                    </span>
                  ),
                },
                {
                  key: 'qrId',
                  header: 'QR ID',
                  render: (r) => (
                    <span className="text-gray-600 text-sm font-mono">
                      {r.qrId || '-'}
                    </span>
                  ),
                },
                {
                  key: 'grnNumber',
                  header: 'GRN No.',
                  render: (r) => (
                    <span className="text-gray-600 text-sm">
                      {r.grnNumber || '-'}
                    </span>
                  ),
                },
                {
                  key: 'binNumber',
                  header: 'Bin No.',
                  render: (r) => (
                    <span className="text-gray-600 text-sm">
                      {r.binNumber ? binToDisplay(r.binNumber) : '-'}
                    </span>
                  ),
                },
                {
                  key: 'username',
                  header: 'Performed By',
                  render: (r) => (
                    <span className="text-gray-600 text-sm">
                      {r.username || '-'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        r.status === 'Success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  ),
                },
              ]}
              onRowClick={(r) => {
                setSelectedLog(r);
                setDialogOpen(true);
              }}
            />
          </div>
        </Card>
      </Section>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          Showing{' '}
          <span className="font-medium">
            {filteredLogs.length === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{' '}
          to{' '}
          <span className="font-medium">
            {Math.min(page * pageSize, filteredLogs.length)}
          </span>{' '}
          of <span className="font-medium">{filteredLogs.length}</span> records
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

      {filteredLogs.length === 0 && !isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-sm text-gray-500">
            No history records found matching your filters.
          </p>
        </div>
      )}

      {/* History Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle>History Log Details</DialogTitle>
            <DialogDescription>
              Complete details for log entry #{selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="font-medium text-gray-600">Log ID</div>
            <div className="text-gray-900">#{selectedLog?.id}</div>

            <div className="font-medium text-gray-600">Module</div>
            <div className="text-gray-900">
              {selectedLog?.moduleType
                ? selectedLog.moduleType.charAt(0).toUpperCase() +
                  selectedLog.moduleType.slice(1)
                : '-'}
            </div>

            <div className="font-medium text-gray-600">Activity</div>
            <div className="text-gray-900">
              {selectedLog?.activityType
                ? selectedLog.activityType
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                : '-'}
            </div>

            <div className="font-medium text-gray-600">Reference ID</div>
            <div className="text-gray-600">
              {selectedLog?.referenceId || '-'}
            </div>

            <div className="font-medium text-gray-600">Bag No.</div>
            <div className="text-gray-600">
              {selectedLog?.bagNumber ?? '-'}
            </div>

            <div className="font-medium text-gray-600">QR ID</div>
            <div className="text-gray-600 font-mono">
              {selectedLog?.qrId || '-'}
            </div>

            <div className="font-medium text-gray-600">GRN No.</div>
            <div className="text-gray-600">
              {selectedLog?.grnNumber || '-'}
            </div>

            <div className="font-medium text-gray-600">Bin No.</div>
            <div className="text-gray-600">
              {selectedLog?.binNumber
                ? binToDisplay(selectedLog.binNumber)
                : '-'}
            </div>

            <div className="font-medium text-gray-600">Performed By</div>
            <div className="text-gray-900">
              {selectedLog?.username || '-'}
            </div>

            <div className="font-medium text-gray-600">Status</div>
            <div className={`text-gray-900 font-medium`}>
              {selectedLog?.status}
            </div>

            <div className="font-medium text-gray-600">Date & Time</div>
            <div className="text-gray-900">
              {new Date(selectedLog?.createdAt ?? '').toLocaleString()}
            </div>

            {selectedLog?.errorMessage && (
              <>
                <div className="font-medium text-gray-600">Error Details</div>
                <div className="text-red-600 text-sm">
                  {selectedLog?.errorMessage}
                </div>
              </>
            )}

            {selectedLog?.metadata && (
              <>
                <div className="font-medium text-gray-600">Metadata</div>
                <div className="text-gray-900 text-sm break-words">
                {typeof selectedLog.metadata === 'string'
                  ? selectedLog.metadata
                  : JSON.stringify(selectedLog.metadata ?? {}, null, 2)}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-6 flex justify-end">
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
