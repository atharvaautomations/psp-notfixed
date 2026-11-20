'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { qcApi, type QcInspectionHistoryItem } from '../services/qc.api';

interface Props {
  className?: string;
  onRetest?: (item: QcInspectionHistoryItem) => void;
}

export default function QcHistoryTable({ className = '', onRetest }: Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

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
        qcResult: item.status,
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

  const totalPages = Math.ceil(inspections.length / itemsPerPage);
  const visibleData = inspections.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <tr className="border-b border-gray-200 bg-gray-50/70 text-slate-700">
              <TableHead className="w-16 font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Final Batch QR ID</TableHead>
              <TableHead className="font-semibold">Batch No.</TableHead>
              <TableHead className="font-semibold">Execution</TableHead>
              <TableHead className="font-semibold">Recipe</TableHead>
              <TableHead className="font-semibold">QC Result</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {visibleData.map((item) => {
              const isRetested = Boolean(item.remarks?.includes('[RETESTED]'));
              const isFailed = item.status === 'FAIL' || item.status === 'RETEST';
              const canRetest = isFailed && !isRetested;

              return (
                <TableRow key={item.id} className="hover:bg-gray-50/50">
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
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === 'PASS'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
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
                      {/* Retest Action Button if failed and not yet retested */}
                      {canRetest && onRetest && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRetest(item)}
                          className="border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 font-medium text-xs h-8 gap-1.5 shadow-sm"
                          title="Retest this batch (allowed 1 time only)"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                          <span>Retest</span>
                        </Button>
                      )}

                      {/* Final Failed notice if already retested once and failed */}
                      {isFailed && isRetested && (
                        <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded font-medium">
                          Final Failed
                        </span>
                      )}

                      {/* Print QR button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printMutation.mutate(item)}
                        disabled={printMutation.isPending}
                        className="text-xs h-8 gap-1 border-gray-200 text-gray-700 hover:bg-gray-100"
                        title="Print QC Label"
                      >
                        <Printer className="h-3.5 w-3.5 text-gray-500" />
                        <span>Print QR</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
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
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
