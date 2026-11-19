'use client';

import React from 'react';
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/global';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  qcApi,
  type InspectionPayload,
  type ScanQcResponse,
  type QcInspectionParameterInputDto,
} from '../services/qc.api';
import { QcInspectionTable } from './QcInspectionTable';
import QcHistoryTable from './QcHistoryTable';

export default function QcInspectionTab() {
  const [qrId, setQrId] = useState('');
  const [batch, setBatch] = useState<ScanQcResponse | null>(null);
  const [formParameters, setFormParameters] = useState<QcInspectionParameterInputDto[]>([]);
  const [remarks, setRemarks] = useState('');

  const scanMutation = useMutation({
    mutationFn: async (value: string) => (await qcApi.scanQr(value)).data,
    onSuccess: (data) => {
      setBatch(data);
      // Initialize form parameters from specification parameters
      if (data.specification?.parameters) {
        setFormParameters(
          data.specification.parameters.map((p) => ({
            specificationParameterId: p.id,
            actualValue: undefined,
            result: undefined,
            observations: undefined,
            isEnabled: p.isEnabled ?? true,
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

  const queryClient = useQueryClient();

  const createInspection = useMutation({
    mutationFn: async (payload: InspectionPayload) =>
      (await qcApi.createInspection(payload)).data,
    onSuccess: (res: { message?: string }) => {
      toast({ title: res.message || 'Inspection saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });
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
    scanMutation.mutate(qrId.trim());
  }, [qrId, scanMutation]);

  const handleSubmit = useCallback(() => {
    if (!batch) {
      toast({
        title: 'No batch loaded',
        description:
          'Scan the batch QR ID first to load the recipe and specification.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that at least one parameter is enabled
    const enabledParams = formParameters.filter((p) => p.isEnabled !== false);
    if (enabledParams.length === 0) {
      toast({
        title: 'Validation error',
        description: 'At least one test parameter must be enabled.',
        variant: 'destructive',
      });
      return;
    }

    // Validate each enabled parameter
    for (const param of enabledParams) {
      if (param.actualValue === undefined || param.actualValue === null) {
        toast({
          title: 'Validation error',
          description: 'All enabled parameters must have an actual value.',
          variant: 'destructive',
        });
        return;
      }
      if (!param.result) {
        toast({
          title: 'Validation error',
          description: 'All enabled parameters must have a result (PASS/FAIL/RETEST).',
          variant: 'destructive',
        });
        return;
      }
      if ((param.result === 'FAIL' || param.result === 'RETEST') && !param.observations) {
        toast({
          title: 'Validation error',
          description: 'Observations are required for FAIL or RETEST results.',
          variant: 'destructive',
        });
        return;
      }
    }

    const payload: InspectionPayload = {
      finalBatchId: batch.finalBatchId,
      parameters: formParameters,
      remarks: remarks || undefined,
    };

    createInspection.mutate(payload);
  }, [batch, formParameters, remarks, createInspection]);

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label className="text-gray-900">Final batch QR ID</Label>
            <Input
              value={qrId}
              onChange={(event) => setQrId(event.target.value)}
              placeholder="Enter QR ID"
              className="mt-2 bg-white border-gray-200"
            />
          </div>
          <Button onClick={handleScan} disabled={scanMutation.isPending}>
            {scanMutation.isPending ? 'Scanning...' : 'Scan Batch'}
          </Button>
        </div>

        {batch && !Array.isArray(batch) && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-900">
                Scanned batch details
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-medium">QR ID:</span> {batch.qrId}
                </p>
                <p>
                  <span className="font-medium">Recipe:</span>{' '}
                  {batch.recipe?.recipeCode || 'N/A'} -{' '}
                  {batch.recipe?.name || 'N/A'}
                </p>
                <p>
                  <span className="font-medium">Batch:</span>{' '}
                  {batch.batch?.batchNumber || 'N/A'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">
                Target values from specification
              </h3>
              <div className="mt-3 grid gap-2 text-sm text-gray-700">
                {batch.specification?.parameters?.map((param) => (
                  <div
                    key={param.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                  >
                    <span>{param.name}</span>
                    <span className="font-medium">
                      {param.targetValue !== null && param.targetValue !== undefined ? (
                        <>
                          {param.targetValue}
                          {param.tolerance && (
                            <span className="text-gray-500 ml-1">
                              ±{param.tolerance}{param.toleranceType === 'PERCENTAGE' ? '%' : ''}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </Card>

        {batch && !Array.isArray(batch) && (
          <QcInspectionTable
            specificationParameters={batch.specification?.parameters || []}
            initialParameters={formParameters}
            onParametersChange={setFormParameters}
            existingFiles={{}}
            isLoading={false}
            isSubmitting={false}
          />
        )}

        <Card className="border border-gray-200 p-6">
          <div className="mb-4">
            <Label className="text-gray-900">Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className="mt-2 bg-white border-gray-200"
              placeholder="Add any notes about the inspection"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={createInspection.isPending}
            >
              {createInspection.isPending ? 'Saving inspection...' : 'Save Inspection'}
            </Button>
          </div>
        </Card>

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              QC Inspection History
            </h3>
            <p className="text-sm text-gray-600">
              View past inspections and print QR labels for inspected batches.
            </p>
          </div>
          <QcHistoryTable />
        </div>
      </div>
    );
  }