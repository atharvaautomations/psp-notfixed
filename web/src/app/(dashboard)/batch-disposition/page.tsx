'use client';

import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { QrCode, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Header, PageContainer } from '@/components/global';
import { useSearchParams } from 'next/navigation';
import { qcApi } from '@/app/(dashboard)/qc/services/qc.api';

interface BatchDispositionData {
  finalBatch: {
    id: number;
    qrId: string;
    batchNumber: string;
    recipe: {
      id: number;
      recipeCode: string;
      name: string;
    };
    executionBatch: {
      batchNumber: number;
      executionCode: string;
    } | null;
  };
  qcInspection: {
    id: number;
    status: string;
    overallResult: string;
    testedAt: string;
    inspectedBy: { id: number; name: string } | null;
  };
  checks: {
    allIngredientsWeighed: 'PASS' | 'FAIL';
    weighingWithinTolerance: 'PASS' | 'FAIL';
    mixingParameters: 'PASS' | 'FAIL';
    qcSpecification: 'PASS' | 'FAIL';
    traceabilityComplete: 'PASS' | 'FAIL';
    batchRelease: 'APPROVED' | 'NOT APPROVED';
  };
  labelInfo: {
    customerName: string;
    partName: string;
    partNumber: string;
    expiryDate: string;
    compoundName: string;
    qcStatus: string;
    mixingDate: string | null;
    shift: string | null;
  } | null;
  releasedBy: {
    name: string;
    date: string;
  } | null;
}

export default function BatchDispositionPage() {
  const searchParams = useSearchParams();

  const [qrId, setQrId] = useState('');
  const [batchData, setBatchData] = useState<BatchDispositionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: async (value: string) => (await qcApi.scanQrForBatchDisposition(value)).data,
    onSuccess: (data) => {
      setBatchData(data);
      setError(null);
      setLoading(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setBatchData(null);
      setLoading(false);
      const message = err.response?.data?.message || 'Something went wrong.';
      setError(message);
      toast({
        title: 'Unable to load batch disposition',
        description: message,
        variant: 'destructive',
      });
    },
  });

  // Auto-scan when qrId is provided in URL query params
  React.useEffect(() => {
    const urlQrId = searchParams.get('qrId');
    if (urlQrId && !batchData && !loading) {
      setQrId(urlQrId);
      setLoading(true);
      scanMutation.mutate(urlQrId);
    }
  }, [searchParams, batchData, loading, scanMutation]);

  const handleScan = useCallback(() => {
    if (!qrId.trim()) {
      toast({
        title: 'QR ID is required',
        description: 'Enter the final batch QR ID before scanning.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setError(null);
    setBatchData(null);
    scanMutation.mutate(qrId.trim());
  }, [qrId, scanMutation]);

  const handleClear = useCallback(() => {
    setQrId('');
    setBatchData(null);
    setError(null);
  }, []);

  const getStatusBadge = (status: 'PASS' | 'FAIL' | 'APPROVED' | 'NOT APPROVED') => {
    switch (status) {
      case 'PASS':
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAIL':
      case 'NOT APPROVED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: 'PASS' | 'FAIL' | 'APPROVED' | 'NOT APPROVED') => {
    switch (status) {
      case 'PASS':
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAIL':
      case 'NOT APPROVED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading && !batchData) {
    return (
      <PageContainer>
        <Header
          title="Batch Disposition"
          description="Scan QC Label QR code to view batch disposition report"
          icon="📋"
        />
        <div className="mt-8 flex flex-col items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-sm text-gray-500">Loading batch disposition...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header
        title="Batch Disposition"
        description="Scan QC Label QR code to view batch disposition report"
        icon="📋"
      />

      <div className="mt-8 flex justify-end gap-2">
        <Button
          onClick={handleClear}
          variant="outline"
          className="flex items-center gap-2"
        >
          <QrCode className="h-4 w-4" />
          <span>Scan Another</span>
        </Button>
      </div>

      <Card className="mt-8 border border-gray-200 p-6 bg-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label className="text-gray-900 font-medium">
              Final Batch QR ID
            </Label>
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
                disabled={loading}
              />
              <QrCode className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleScan}
              disabled={loading || !qrId.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 shadow-sm"
            >
              <Search className="h-4 w-4" />
              <span>{loading ? 'Scanning...' : 'Scan Batch'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="mt-8 border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {batchData && (
        <div className="mt-8 space-y-6">
          {/* Batch Information */}
          <Card className="border border-gray-200 p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Batch Disposition Report</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Final Batch: {batchData.finalBatch.qrId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                    batchData.checks.batchRelease === 'APPROVED'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                  }`}
                >
                  {batchData.checks.batchRelease}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  Final Batch QR ID
                </p>
                <p className="mt-1 font-mono font-semibold text-gray-800 truncate" title={batchData.finalBatch.qrId}>
                  {batchData.finalBatch.qrId}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  Batch Number
                </p>
                <p className="mt-1 font-semibold text-gray-800">
                  {batchData.finalBatch.batchNumber}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  Recipe Code
                </p>
                <p className="mt-1 font-semibold text-gray-800">
                  {batchData.finalBatch.recipe.recipeCode}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  Execution Code
                </p>
                <p className="mt-1 font-mono text-gray-800">
                  {batchData.finalBatch.executionBatch?.executionCode || 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          {/* QC Inspection Summary */}
          <Card className="border border-gray-200 p-6 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">QC Inspection Summary</h3>
                <p className="text-sm text-gray-500">
                  Inspection ID: {batchData.qcInspection.id} | Status: {batchData.qcInspection.status}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  QC Inspection Status
                </p>
                <p className="mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-transparent text-white bg-green-600 shadow-sm">
                  {batchData.qcInspection.status}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  Overall Result
                </p>
                <p className="mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-transparent text-white bg-green-600 shadow-sm">
                  {batchData.qcInspection.overallResult}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  Inspection Date
                </p>
                <p className="mt-1 font-semibold text-gray-800">
                  {new Date(batchData.qcInspection.testedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                  Inspected By
                </p>
                <p className="mt-1 font-semibold text-gray-800">
                  {batchData.qcInspection.inspectedBy?.name || 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          {/* Checks Table */}
          <Card className="border border-gray-200 p-6 bg-white shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Batch Disposition Checks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-slate-700">
                    <th className="px-4 py-3 text-left font-semibold">Checks</th>
                    <th className="px-4 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {[
                    { key: 'allIngredientsWeighed', label: 'All Ingredients Weighed' },
                    { key: 'weighingWithinTolerance', label: 'Weighing Within Tolerance' },
                    { key: 'mixingParameters', label: 'Mixing Parameters' },
                    { key: 'qcSpecification', label: 'QC Specification' },
                    { key: 'traceabilityComplete', label: 'Traceability Complete' },
                    { key: 'batchRelease', label: 'Batch Release' },
                  ].map(({ key, label }) => (
                    <tr key={key} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-gray-800">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(batchData.checks[key as keyof typeof batchData.checks])}
                          <span className="font-medium">{label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getStatusBadge(batchData.checks[key as keyof typeof batchData.checks])}`}
                        >
                          {batchData.checks[key as keyof typeof batchData.checks]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Label Information */}
          {batchData.labelInfo && (
            <Card className="border border-gray-200 p-6 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 01-7 7h10a7 7 0 01-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Label Information</h3>
                  <p className="text-sm text-gray-500">Traceability details from QC Label</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Customer Name
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">{batchData.labelInfo.customerName}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Part Name
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">{batchData.labelInfo.partName}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Part Number
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">{batchData.labelInfo.partNumber}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Expiry Date
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">{batchData.labelInfo.expiryDate}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Compound Name
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">{batchData.labelInfo.compoundName}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    QC Status
                  </p>
                  <p className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-transparent text-white shadow-sm ${
                    batchData.labelInfo.qcStatus === 'FAIL' ? 'bg-red-600' : 'bg-green-600'
                  }`}>
                    {batchData.labelInfo.qcStatus}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Release Information */}
          {batchData.releasedBy && (
            <Card className="border border-gray-200 p-6 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Release Information</h3>
                  <p className="text-sm text-gray-500">Batch release authorization details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Released By
                  </p>
                  <p className="mt-1 font-semibold text-gray-800">{batchData.releasedBy.name}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">
                    Release Date / Time
                  </p>
                  <p className="mt-1 font-mono font-semibold text-gray-800">
                    {new Date(batchData.releasedBy.date).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </PageContainer>
  );
}