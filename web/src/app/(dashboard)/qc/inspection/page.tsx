'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileCheck, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  qcApi,
  type QcInspectionParameterInputDto,
  type ScanQcResponse,
  type SaveLabelInfoDto,
} from '../services/qc.api';
import QcInspectionTable from '../components/QcInspectionTable';
import { RetestAuditTable, type RetestAuditData } from '../components/RetestAuditTable';

export default function QcInspectionWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const qrId = searchParams.get('qrId') ?? '';
  const retestId = searchParams.get('retestId');
  const isRetest = retestId !== null;

  const [batch, setBatch] = useState<ScanQcResponse | null>(null);
  const [formParameters, setFormParameters] = useState<QcInspectionParameterInputDto[]>([]);
  const [labelInfoDialog, setLabelInfoDialog] = useState(false);
  const [labelInfo, setLabelInfo] = useState<SaveLabelInfoDto | null>(null);
  const [retestAuditData, setRetestAuditData] = useState<RetestAuditData | null>(null);
  const [retestAuditComplete, setRetestAuditComplete] = useState(false);
  const [pendingRetestData, setPendingRetestData] = useState<{ parameters: QcInspectionParameterInputDto[]; filesMap: Record<number, File> } | null>(null);
  const isSavingRetestRef = useRef(false);
  const [loading, setLoading] = useState(false);

  // Track initialization to prevent re-initialization loops
  const initializedRef = useRef(false);
  const retestInitializedRef = useRef(false);
  const qcTableRef = useRef<any>(null);

  // Stable mutation handlers
  const handleScanSuccess = useCallback((data: ScanQcResponse) => {
    setBatch(data);
    setLoading(false);
  }, []);

  const handleScanError = useCallback((err: { response?: { data?: { message?: string } } }) => {
    toast({
      title: 'Unable to load batch',
      description: err.response?.data?.message || 'Something went wrong.',
      variant: 'destructive',
    });
    setLoading(false);
  }, []);

  const scanOptions = useMemo(() => ({
    mutationFn: async (value: string) => (await qcApi.scanQr(value)).data,
    onSuccess: handleScanSuccess,
    onError: handleScanError,
  }), [handleScanSuccess, handleScanError]);

  const scanMutation = useMutation(scanOptions);
  const scanMutationRef = useRef(scanMutation);

  // Keep ref updated
  scanMutationRef.current = scanMutation;

  const handleSaveSuccess = useCallback(async (res: { message?: string; inspection?: any }) => {
    toast({ title: res.message || 'Inspection saved successfully' });
    queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });

    if (isRetest && retestAuditData && res.inspection?.id) {
      try {
        await qcApi.createRetestAudit({
          qcInspectionId: res.inspection.id,
          stage: retestAuditData.stage,
          deviation: retestAuditData.deviation,
          reason: retestAuditData.reason,
          actionTaken: retestAuditData.actionTaken,
          approvedBy: retestAuditData.approvedBy,
        });
      } catch (auditErr) {
        console.warn('Failed to save retest audit:', auditErr);
      }
    }

    // Show QC Label Information dialog only for:
    // - Initial inspection PASS
    // - Retest PASS or FAIL
    // Not for initial inspection FAIL
    const shouldShowLabelInfo = !isSavingRetestRef.current && (isRetest || res.inspection?.overallResult === 'PASS' || res.inspection?.status === 'PASS');

    if (isSavingRetestRef.current) {
      isSavingRetestRef.current = false;
      router.push('/qc');
      return;
    }

    if (shouldShowLabelInfo) {
      setLabelInfo({
        finalBatchId: batch?.finalBatchId!,
        qcInspectionId: res.inspection?.id,
        customerName: '',
        partName: '',
        partNumber: '',
        expiryDate: '',
        compoundName: '',
        qcStatus: res.inspection?.overallResult || res.inspection?.status || 'PASS',
      });
      setLabelInfoDialog(true);
    } else {
      router.push('/qc');
    }
  }, [queryClient, isRetest, retestAuditData, batch, qcApi, router]);

  const handleSaveError = useCallback((err: { response?: { data?: { message?: string } } }) => {
    toast({
      title: 'Unable to save inspection',
      description: err.response?.data?.message || 'Something went wrong.',
      variant: 'destructive',
    });
  }, []);

  const createInspectionOptions = useMemo(() => ({
    mutationFn: async (payload: { finalBatchId: number; parameters: QcInspectionParameterInputDto[]; inspectionId?: number }) =>
      (await qcApi.createInspection(payload)).data,
    onSuccess: handleSaveSuccess,
    onError: handleSaveError,
  }), [handleSaveSuccess, handleSaveError]);

  const createInspection = useMutation(createInspectionOptions);
  const createInspectionRef = useRef(createInspection);
  createInspectionRef.current = createInspection;

  const handleLabelInfoSuccess = useCallback(async () => {
    toast({ title: 'QC Label Information saved successfully' });
    setLabelInfoDialog(false);
    setLabelInfo(null);

    if (pendingRetestData) {
      isSavingRetestRef.current = true;
      const { parameters, filesMap } = pendingRetestData;
      setPendingRetestData(null);

      // Upload files first, then save inspection
      const fileUploadPromises = Object.entries(filesMap).map(
        async ([paramIdStr, file]) => {
          const paramId = Number(paramIdStr);
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parameterId', String(paramId));
            formData.append('finalBatchId', String(batch?.finalBatchId));
            await qcApi.uploadFile(formData);
          } catch (uploadErr) {
            console.warn(`File upload for parameter ${paramId} skipped:`, uploadErr);
          }
        }
      );

      if (fileUploadPromises.length > 0) {
        await Promise.allSettled(fileUploadPromises);
      }

      createInspectionRef.current.mutate({ finalBatchId: batch?.finalBatchId!, parameters, inspectionId: retestId ? Number(retestId) : undefined });
    } else {
      router.push('/qc');
    }
  }, [router, pendingRetestData, retestId, batch, qcApi]);

  const handleLabelInfoError = useCallback((err: { response?: { data?: { message?: string } } }) => {
    toast({
      title: 'Unable to save label information',
      description: err.response?.data?.message || 'Something went wrong.',
      variant: 'destructive',
    });
  }, []);

  const saveLabelInfoOptions = useMemo(() => ({
    mutationFn: async (data: SaveLabelInfoDto) =>
      (await qcApi.saveLabelInfo(data)).data,
    onSuccess: handleLabelInfoSuccess,
    onError: handleLabelInfoError,
  }), [handleLabelInfoSuccess, handleLabelInfoError]);

  const saveLabelInfoMutation = useMutation(saveLabelInfoOptions);
  const saveLabelInfoRef = useRef(saveLabelInfoMutation);
  saveLabelInfoRef.current = saveLabelInfoMutation;

  // Scan batch on mount (only once, using ref to avoid scanMutation dependency)
  useEffect(() => {
    if (qrId && !initializedRef.current) {
      initializedRef.current = true;
      setLoading(true);
      scanMutationRef.current.mutate(qrId);
    }
  }, [qrId]);

  // Initialize form parameters from batch specification (initial inspection)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (!isRetest && batch?.specification?.parameters && formParameters.length === 0) {
      setFormParameters(
        batch.specification.parameters.map((p) => ({
          specificationParameterId: p.id,
          actualValue: undefined,
          result: undefined,
          isEnabled: false,
        }))
      );
    }
  }, [batch?.specification?.parameters, isRetest, formParameters.length, initializedRef.current]);

  // Initialize form parameters from original inspection (retest mode)
  // Only parameters that were enabled during initial inspection should be editable
  useEffect(() => {
    if (retestInitializedRef.current || !isRetest || !retestId || formParameters.length > 0) return;

    const fetchOriginalInspection = async () => {
      retestInitializedRef.current = true;
      try {
        const res = await qcApi.getInspectionById(Number(retestId));
        const original = res.data;
        const params = original?.parameters || [];
        setFormParameters(
          params.map((p: any) => ({
            specificationParameterId: p.specificationParameterId,
            actualValue:
              p.actualValue !== undefined && p.actualValue !== null
                ? String(p.actualValue)
                : undefined,
            result: p.result,
            isEnabled: p.isEnabled ?? false,
            testMethod: p.testMethod ?? undefined,
            unit: p.unit ?? undefined,
            specificationText: p.specificationText ?? undefined,
          }))
        );
      } catch (err) {
        console.warn('Failed to fetch original inspection parameters:', err);
        // Fallback: enable all parameters if fetch fails
        if (batch?.specification?.parameters) {
          setFormParameters(
            batch.specification.parameters.map((p) => ({
              specificationParameterId: p.id,
              actualValue: undefined,
              result: undefined,
              isEnabled: true,
              testMethod: p.testMethod ?? undefined,
              unit: p.unit ?? undefined,
              specificationText: undefined,
            }))
          );
        }
      }
    };

    fetchOriginalInspection();
  }, [isRetest, retestId, batch?.specification?.parameters, formParameters.length, retestInitializedRef.current, qcApi]);

  const handleBack = useCallback(() => {
    router.push('/qc');
  }, [router]);

  const handleRetestAuditDataChange = useCallback((data: RetestAuditData) => {
    setRetestAuditData(data);
  }, []);

  const handleSaveInspection = useCallback(
    async (
      parameters: QcInspectionParameterInputDto[],
      filesMap: Record<number, File>
    ) => {
      if (!batch) return;

      // During retest, audit details are mandatory
      if (isRetest && retestAuditData) {
        const { dateTime, stage, deviation, reason, actionTaken, approvedBy } = retestAuditData;
        if (!dateTime || !stage || !deviation || !reason || !actionTaken || !approvedBy) {
          toast({
            title: 'Missing Retest Audit Details',
            description: 'All retest audit fields are mandatory before saving.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Always open QC Label Information dialog first, then save inspection
      setPendingRetestData({ parameters, filesMap });
      setLabelInfo({
        finalBatchId: batch.finalBatchId,
        qcInspectionId: undefined,
        customerName: '',
        partName: '',
        partNumber: '',
        expiryDate: '',
        compoundName: '',
        qcStatus: 'PASS',
      });
      setLabelInfoDialog(true);
    },
    [batch, retestId, isRetest, retestAuditData, qcApi]
  );

  const handleSaveLabelInfo = useCallback(() => {
    if (!labelInfo || !batch) return;

    // Validate all mandatory fields
    if (!labelInfo.customerName?.trim() || !labelInfo.partName?.trim() || !labelInfo.partNumber?.trim() || !labelInfo.expiryDate || !labelInfo.compoundName?.trim()) {
      toast({
        title: 'Missing Label Information',
        description: 'All fields are required: Customer Name, Part Name, Part Number, Expiry Date, Compound Name.',
        variant: 'destructive',
      });
      return;
    }

    saveLabelInfoRef.current.mutate(labelInfo);
  }, [labelInfo, batch]);

  if (loading && !batch) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-gray-500">Loading batch details...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-sm text-gray-500">No batch data available.</p>
        <Button onClick={handleBack} variant="outline">
          Back to QC
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            QC Inspection Workspace
          </h1>
          <p className="text-gray-600 mt-1">
            {isRetest ? 'Retest Mode' : 'Initial Inspection'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to History</span>
        </Button>
      </div>

      <Card className="border border-blue-200 bg-blue-50/40 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-blue-100/60 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              Scanned Batch Details
            </h3>
          </div>
          {isRetest && retestId && (
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
              Retest Mode (Inspection #{retestId})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="rounded-lg bg-white p-3 border border-blue-100/80 shadow-xs">
            <span className="text-xs font-medium text-gray-500 block">QR ID</span>
            <span className="font-mono font-semibold text-gray-900 mt-0.5 block truncate" title={qrId}>
              {qrId}
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
              {batch.batch?.execution?.executionCode || 'N/A'}
            </span>
          </div>
        </div>
      </Card>

      <Card className="border border-gray-200 p-6 bg-white shadow-sm">
        <QcInspectionTable
          ref={qcTableRef}
          specificationParameters={batch.specification?.parameters || []}
          initialParameters={formParameters}
          isRetest={isRetest}
          retestInspectionId={retestId ? Number(retestId) : null}
          isSubmitting={createInspection.isPending}
          onSave={handleSaveInspection}
          onReset={() => {
            setFormParameters([]);
          }}
          showSaveButton={!isRetest}
        />

        {/* Retest Audit Details Table - shown only during retest */}
        {isRetest && (
          <RetestAuditTable
            isRequired
            onDataChange={handleRetestAuditDataChange}
            onIsCompleteChange={setRetestAuditComplete}
          />
        )}

        {isRetest && retestAuditComplete && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              type="button"
              onClick={() => {
                const formData = qcTableRef.current?.getFormData();
                if (formData) {
                  handleSaveInspection(formData.parameters, formData.filesMap);
                }
              }}
              disabled={createInspection.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 shadow-sm gap-2"
            >
              {createInspection.isPending ? (
                <span>Saving retest...</span>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Save Retest</span>
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={labelInfoDialog} onOpenChange={setLabelInfoDialog}>
        <DialogContent className="max-w-lg p-6 bg-white">
          <DialogHeader>
            <DialogTitle>QC Label Information</DialogTitle>
            <DialogDescription>
              Enter label details for printing the QC label.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Customer Name *</Label>
                <Input
                  value={labelInfo?.customerName ?? ''}
                  onChange={(e) =>
                    setLabelInfo({ ...labelInfo!, customerName: e.target.value })
                  }
                  placeholder="Enter customer name"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Part Name *</Label>
                <Input
                  value={labelInfo?.partName ?? ''}
                  onChange={(e) =>
                    setLabelInfo({ ...labelInfo!, partName: e.target.value })
                  }
                  placeholder="Enter part name"
                  className="bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Part Number *</Label>
                <Input
                  value={labelInfo?.partNumber ?? ''}
                  onChange={(e) =>
                    setLabelInfo({ ...labelInfo!, partNumber: e.target.value })
                  }
                  placeholder="Enter part number"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Expiry Date *</Label>
                <Input
                  type="date"
                  value={labelInfo?.expiryDate ?? ''}
                  onChange={(e) =>
                    setLabelInfo({ ...labelInfo!, expiryDate: e.target.value })
                  }
                  className="bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Compound Name *</Label>
              <Input
                  value={labelInfo?.compoundName ?? ''}
                  onChange={(e) =>
                    setLabelInfo({ ...labelInfo!, compoundName: e.target.value })
                  }
                  placeholder="Enter compound name"
                  className="bg-white"
                />
              </div>
            <div className="text-xs text-gray-500 mt-2">
              Batch Number, Mixing Date/Shift, and QC Status are automatically fetched from the database.
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setLabelInfoDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLabelInfo}
              disabled={saveLabelInfoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveLabelInfoMutation.isPending ? 'Saving...' : 'Save & Print Label'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}