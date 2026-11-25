'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Printer, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { qcApi, type QcInspectionHistoryItem } from '../services/qc.api';

interface Props {
  className?: string;
  onRetest?: (item: QcInspectionHistoryItem) => void;
}

function statusBadge(status?: string) {
  switch (status) {
    case 'PASS':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'FAIL':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'RETEST':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
}

export default function QcHistoryTable({ className = '', onRetest }: Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50];
  const [selectedInspection, setSelectedInspection] = useState<QcInspectionHistoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['qc-inspections'],
    queryFn: async () => (await qcApi.getInspections()).data,
  });

  const printMutation = useMutation({
    mutationFn: async (item: QcInspectionHistoryItem) =>
      await qcApi.printQcLabel({
        qrId: item.finalBatch.qrId,
        recipeCode: item.finalBatch.recipe.recipeCode,
        batchNumber: item.finalBatch.executionBatch.batchNumber,
        qcResult: item.status as 'PASS' | 'FAIL',
      }),
    onSuccess: () => {
      toast({ title: 'QC label printed successfully' });
      queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Unable to print QC label',
        description: err.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Loading inspection history...
      </div>
    );
  }

  if (!inspections.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No QC inspection history found.
      </div>
    );
  }

  const totalPages = Math.ceil(inspections.length / pageSize);
  const visibleData = inspections.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <tr className="border-b border-gray-200 bg-gray-50/70 text-slate-700">
              <TableHead className="w-16 font-semibold cursor-pointer">ID</TableHead>
              <TableHead className="font-semibold cursor-pointer">Final Batch QR ID</TableHead>
              <TableHead className="font-semibold cursor-pointer">Batch No.</TableHead>
              <TableHead className="font-semibold cursor-pointer">Execution</TableHead>
              <TableHead className="font-semibold cursor-pointer">Recipe</TableHead>
              <TableHead className="font-semibold cursor-pointer">QC Result</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {visibleData.map((item) => {
              const isRetested = Boolean(item.remarks?.includes('[RETESTED]'));
              const isFailed = item.status === 'FAIL' || item.status === 'RETEST';
              const canRetest = isFailed && !isRetested;
              const isFinalPassOrFail = item.status === 'PASS' || (item.status === 'FAIL' && isRetested);

              return (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedInspection(item);
                    setDialogOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-xs text-gray-600">
                    #{item.id}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-gray-800">
                    {item.finalBatch.qrId}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {item.finalBatch.executionBatch.batchNumber}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {item.finalBatch.executionBatch.execution.executionCode}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-800">
                    {item.finalBatch.recipe.recipeCode}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(item.status)}`}
                      >
                        {item.status}
                      </span>
                      {isRetested && (
                        <span className="text-[10px] text-gray-500 font-medium">
                          (Retested)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canRetest && onRetest && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetest(item);
                          }}
                          className="border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 font-medium text-xs h-8 gap-1.5 shadow-sm"
                          title="Retest this batch (allowed 1 time only)"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                          <span>Retest</span>
                        </Button>
                      )}

                      {isFailed && isRetested && (
                        <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded font-medium">
                          Final Failed
                        </span>
                      )}

                      {isFinalPassOrFail && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            printMutation.mutate(item);
                          }}
                          disabled={printMutation.isPending}
                          className="text-xs h-8 gap-1 border-gray-200 text-gray-700 hover:bg-gray-100"
                          title="Print QC Label"
                        >
                          <Printer className="h-3.5 w-3.5 text-gray-500" />
                          <span>Print QR</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-medium">
              {(page - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(page * pageSize, inspections.length)}
            </span>{' '}
            of <span className="font-medium">{inspections.length}</span> records
          </div>

          <div className="flex items-center gap-1">
            <label className="text-sm text-gray-600">Records per page:</label>
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
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
                size="sm"
                variant={page === p ? 'default' : 'outline'}
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
      )}

      {/* Inspection Detail Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl p-0 md:p-6 bg-white max-h-screen overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Inspection Details #{selectedInspection?.id}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Final Batch: {selectedInspection?.finalBatch.qrId}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(selectedInspection?.status)}`}
                >
                  {selectedInspection?.status}
                </span>
                {Boolean(selectedInspection?.remarks?.includes('[RETESTED]')) && (
                  <span className="text-[10px] text-gray-500 font-medium">
                    Retested
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 md:p-6 space-y-6">
            {/* Section 1: Batch Information */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Batch Information
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Final Batch QR ID
                  </p>
                  <p className="mt-1 font-mono font-semibold text-gray-800 truncate" title={selectedInspection?.finalBatch.qrId}>
                    {selectedInspection?.finalBatch.qrId}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Batch Number
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedInspection?.finalBatch.executionBatch.batchNumber}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Execution Code
                  </p>
                  <p className="mt-1 font-mono text-gray-800">
                    {selectedInspection?.finalBatch.executionBatch.execution.executionCode}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Recipe Code
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedInspection?.finalBatch.recipe.recipeCode}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Recipe Name
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedInspection?.finalBatch.recipe.name || 'N/A'}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Inspection Information */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Inspection Information
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Inspection ID
                  </p>
                  <p className="mt-1 font-mono font-semibold text-gray-800">
                    #{selectedInspection?.id}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Inspection Date & Time
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {new Date(selectedInspection?.testedAt || Date.now()).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Overall QC Result
                  </p>
                  <p className="mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-transparent text-white bg-green-600 shadow-sm">
                    {selectedInspection?.status}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Inspection Type
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedInspection?.remarks?.includes('[RETESTED]') ? 'Retest' : 'Initial'}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Test Parameter Details */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Test Parameter Details
                  </h3>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {(selectedInspection?.parameters as any[] ?? []).filter((p: any) => p.isEnabled !== false).length} parameter(s) tested
                </span>
              </div>
              {selectedInspection?.parameters && selectedInspection.parameters.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-slate-700">
                        <th className="px-4 py-3 text-left font-semibold">Test Parameter</th>
                        <th className="px-4 py-3 text-left font-semibold">Test Method</th>
                        <th className="px-4 py-3 text-left font-semibold">Unit</th>
                        <th className="px-4 py-3 text-left font-semibold">Specification</th>
                        <th className="px-4 py-3 text-left font-semibold">Actual Value</th>
                        <th className="px-4 py-3 text-left font-semibold">Result</th>
                        <th className="px-4 py-3 text-left font-semibold">Uploaded File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {(selectedInspection.parameters as any[])
                        .filter((p: any) => p.isEnabled !== false)
                        .map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {p.specificationParameter?.name || 'N/A'}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {p.testMethod || p.specificationParameter?.testMethod || '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {p.unit || p.specificationParameter?.unit || '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {p.specificationText !== undefined && p.specificationText !== '' ? (
                                p.specificationText
                              ) : p.specificationParameter?.targetValue !== undefined ? (
                                <>
                                  {p.specificationParameter.targetValue}
                                  {p.specificationParameter.unit || ''}
                                  {p.specificationParameter.tolerance !== undefined ? (
                                    <>
                                      {' ±'}{p.specificationParameter.tolerance}
                                      {p.specificationParameter.toleranceType === 'PERCENTAGE' && '%'}
                                    </>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {p.actualValue !== null && p.actualValue !== undefined ? (
                                <span className="font-mono">{p.actualValue}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                  p.result === 'PASS'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : p.result === 'FAIL'
                                      ? 'bg-red-100 text-red-800 border-red-200'
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                {p.result || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {p.files && p.files.length > 0 ? (
                                <span className="text-xs font-medium text-blue-600 truncate max-w-xs" title={p.files[0].fileName}>
                                  {p.files[0].fileName}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">No parameter details available.</p>
                </div>
              )}
            </section>

            {/* Section 4: Retest Information */}
            {selectedInspection?.retestAudits && selectedInspection.retestAudits.length > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ChevronRight className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wider">
                    Retest Information
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-200 bg-amber-100/50 text-amber-900">
                        <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
                        <th className="px-4 py-3 text-left font-semibold">Stage</th>
                        <th className="px-4 py-3 text-left font-semibold">Deviation</th>
                        <th className="px-4 py-3 text-left font-semibold">Reason</th>
                        <th className="px-4 py-3 text-left font-semibold">Action Taken</th>
                        <th className="px-4 py-3 text-left font-semibold">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      {selectedInspection.retestAudits.map((audit: any) => (
                        <tr key={audit.id}>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            {new Date(audit.dateTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-800">{audit.stage}</td>
                          <td className="px-4 py-3 text-gray-600">{audit.deviation}</td>
                          <td className="px-4 py-3 text-gray-600">{audit.reason}</td>
                          <td className="px-4 py-3 text-gray-600">{audit.actionTaken}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{audit.approvedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button
              onClick={() => setDialogOpen(false)}
              variant="outline"
              className="text-gray-600 hover:bg-gray-100"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}