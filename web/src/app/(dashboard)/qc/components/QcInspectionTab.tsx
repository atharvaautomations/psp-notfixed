'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, Search, CheckCircle2, History, X } from 'lucide-react';
import { Card } from '@/components/global';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  qcApi,
  type InspectionPayload,
  type ScanQcResponse,
  type QcInspectionParameterInputDto,
  type QcInspectionHistoryItem,
} from '../services/qc.api';
import { QcInspectionTable } from './QcInspectionTable';
import QcHistoryTable from './QcHistoryTable';

export default function QcInspectionTab() {
  const [qrId, setQrId] = useState('');
  const [batch, setBatch] = useState<ScanQcResponse | null>(null);
  const [formParameters, setFormParameters] = useState<QcInspectionParameterInputDto[]>([]);
  const [remarks, setRemarks] = useState('');
  const [retestInspectionId, setRetestInspectionId] = useState<number | null>(null);
  const retestInspectionIdRef = useRef<number | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: async (value: string) => (await qcApi.scanQr(value)).data,
    onSuccess: (data) => {
      setBatch(data);
      // If we are not in retest mode with existing formParameters, initialize
      if (!retestInspectionIdRef.current && data.specification?.parameters) {
        setFormParameters(
          data.specification.parameters.map((p) => ({
            specificationParameterId: p.id,
            actualValue: undefined,
            result: undefined,
            observations: undefined,
            isEnabled: false, // initially unchecked per specification
          }))
        );
      }
      toast({ title: 'Batch details loaded successfully' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setBatch(null);
      toast({
        title: 'Unable to load batch',
        description: err.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const createInspection = useMutation({
    mutationFn: async (payload: InspectionPayload) =>
      (await qcApi.createInspection(payload)).data,
    onSuccess: (res: { message?: string }) => {
      toast({ title: res.message || 'Inspection saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });
      // Reset active form
      handleResetForm();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Unable to save inspection',
        description: err.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const handleScan = useCallback(() => {
    if (!qrId.trim()) {
      toast({
        title: 'QR ID is required',
        description: 'Enter the final batch QR ID before scanning.',
        variant: 'destructive',
      });
      return;
    }
    setRetestInspectionId(null);
    retestInspectionIdRef.current = null;
    scanMutation.mutate(qrId.trim());
  }, [qrId, scanMutation]);

  // Handle Save Inspection from the Table
  const handleSaveInspection = useCallback(
    async (
      parameters: QcInspectionParameterInputDto[],
      filesMap: Record<number, File>,
      overallRemarks?: string
    ) => {
      if (!batch) {
        toast({
          title: 'No batch loaded',
          description: 'Scan the batch QR ID first to load the recipe details.',
          variant: 'destructive',
        });
        return;
      }

      // Optional file uploads
      const fileUploadPromises = Object.entries(filesMap).map(
        async ([paramIdStr, file]) => {
          const paramId = Number(paramIdStr);
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parameterId', String(paramId));
            if (batch.finalBatchId) {
              formData.append('finalBatchId', String(batch.finalBatchId));
            }
            await qcApi.uploadFile(formData);
          } catch (uploadErr) {
            console.warn(`Optional file upload for parameter ${paramId} skipped:`, uploadErr);
          }
        }
      );

      // Execute any file uploads
      if (fileUploadPromises.length > 0) {
        await Promise.allSettled(fileUploadPromises);
      }

      const payload: InspectionPayload = {
        finalBatchId: batch.finalBatchId,
        parameters,
        remarks: overallRemarks || undefined,
        inspectionId: retestInspectionId || undefined,
      };

      createInspection.mutate(payload);
    },
    [batch, retestInspectionId, createInspection]
  );

  // Handle Retest Action from History Table
  const handleRetest = useCallback(
    async (item: QcInspectionHistoryItem) => {
      const batchQr = item.finalBatch?.qrId;
      if (!batchQr) {
        toast({
          title: 'Error',
          description: 'Final batch QR ID missing from inspection record.',
          variant: 'destructive',
        });
        return;
      }

      setQrId(batchQr);
      setRetestInspectionId(item.id);
      retestInspectionIdRef.current = item.id;
      setRemarks(item.remarks?.replace(/\[RETESTED\]/g, '').trim() || '');

      // Pre-fill form parameters from item.parameters if available
      if (item.parameters && item.parameters.length > 0) {
        setFormParameters(
          item.parameters.map((p) => ({
            specificationParameterId: p.specificationParameterId,
            actualValue: p.actualValue !== null && p.actualValue !== undefined ? Number(p.actualValue) : undefined,
            result: p.result as 'PASS' | 'FAIL' | undefined,
            observations: p.observations || '',
            isEnabled: p.isEnabled ?? true,
          }))
        );
      }

      // Trigger scan to load batch details and specification
      scanMutation.mutate(batchQr, {
        onSuccess: (data) => {
          // If item parameters weren't available, build from specification
          if (!item.parameters || item.parameters.length === 0) {
            if (data.specification?.parameters) {
              setFormParameters(
                data.specification.parameters.map((p) => ({
                  specificationParameterId: p.id,
                  actualValue: undefined,
                  result: undefined,
                  observations: undefined,
                  isEnabled: true,
                }))
              );
            }
          }
          toast({
            title: 'Retest Mode Loaded',
            description: `Editing QC Inspection #${item.id} for batch ${batchQr}.`,
          });

          // Scroll up to the inspection section
          setTimeout(() => {
            tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        },
      });
    },
    [scanMutation]
  );

  // Clear / Reset form
  const handleResetForm = () => {
    setBatch(null);
    setQrId('');
    setFormParameters([]);
    setRemarks('');
    setRetestInspectionId(null);
    retestInspectionIdRef.current = null;
  };

  return (
    <div className="space-y-6" ref={tableContainerRef}>
      {/* 1. Final Batch QR Scan Card */}
      <Card className="border border-gray-200 p-6 bg-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label className="text-gray-900 font-medium">Final batch QR ID</Label>
            <div className="relative mt-2">
              <Input
                value={qrId}
                onChange={(event) => setQrId(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScan();
                  }
                }}
                placeholder="Enter or scan Final Batch QR ID (e.g. FB-EXE-SR001-302030-B1)"
                className="bg-white border-gray-200 pr-10 text-sm"
              />
              <QrCode className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleScan}
              disabled={scanMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 shadow-sm"
            >
              <Search className="h-4 w-4" />
              <span>{scanMutation.isPending ? 'Scanning...' : 'Scan Batch'}</span>
            </Button>
            {batch && (
              <Button
                variant="outline"
                onClick={handleResetForm}
                className="border-gray-200 text-gray-600 hover:bg-gray-100 gap-1"
                title="Clear scanned batch"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>

        {/* 2. Scanned Batch Details Card (Target values section completely removed per instructions) */}
        {batch && !Array.isArray(batch) && (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100/60 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                  Scanned Batch Details
                </h3>
              </div>
              {retestInspectionId && (
                <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                  Retest Mode (Inspection #{retestInspectionId})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="rounded-lg bg-white p-3 border border-blue-100/80 shadow-xs">
                <span className="text-xs font-medium text-gray-500 block">QR ID</span>
                <span className="font-mono font-semibold text-gray-900 mt-0.5 block truncate" title={batch.qrId}>
                  {batch.qrId}
                </span>
              </div>

              <div className="rounded-lg bg-white p-3 border border-blue-100/80 shadow-xs">
                <span className="text-xs font-medium text-gray-500 block">Recipe</span>
                <span className="font-semibold text-gray-900 mt-0.5 block truncate" title={`${batch.recipe?.recipeCode || ''} - ${batch.recipe?.name || ''}`}>
                  {batch.recipe?.recipeCode || 'N/A'} - {batch.recipe?.name || 'N/A'}
                </span>
              </div>

              <div className="rounded-lg bg-white p-3 border border-blue-100/80 shadow-xs">
                <span className="text-xs font-medium text-gray-500 block">Batch Number</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">
                  Batch #{batch.batch?.batchNumber || 'N/A'}
                </span>
              </div>

              <div className="rounded-lg bg-white p-3 border border-blue-100/80 shadow-xs">
                <span className="text-xs font-medium text-gray-500 block">Execution Code</span>
                <span className="font-semibold text-gray-900 mt-0.5 block truncate">
                  {(batch.batch as any)?.execution?.executionCode || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. The 6-Column QC Inspection Table (Appears when batch is scanned) */}
      {batch && !Array.isArray(batch) && (
        <Card className="border border-gray-200 p-6 bg-white shadow-sm">
          <QcInspectionTable
            specificationParameters={batch.specification?.parameters || []}
            initialParameters={formParameters}
            initialRemarks={remarks}
            isRetest={Boolean(retestInspectionId)}
            retestInspectionId={retestInspectionId}
            isSubmitting={createInspection.isPending}
            onSave={handleSaveInspection}
            onReset={() => {
              setFormParameters([]);
              setRemarks('');
            }}
          />
        </Card>
      )}

      {/* 4. QC Inspection History Section */}
      <Card className="border border-gray-200 p-6 bg-white shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                QC Inspection History
              </h3>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              View past inspections, print QR labels, or perform one-time retests on failed batches.
            </p>
          </div>
        </div>
        <QcHistoryTable onRetest={handleRetest} />
      </Card>
    </div>
  );
}
