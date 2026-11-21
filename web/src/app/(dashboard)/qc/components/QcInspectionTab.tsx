'use client';

import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { QrCode, Search, History } from 'lucide-react';
import { Card } from '@/components/global';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import {
  qcApi,
  type QcInspectionHistoryItem,
} from '../services/qc.api';
import QcHistoryTable from './QcHistoryTable';

export default function QcInspectionTab() {
  const router = useRouter();
  const [qrId, setQrId] = useState('');

  const scanMutation = useMutation({
    mutationFn: async (value: string) => (await qcApi.scanQr(value)).data,
    onSuccess: (data) => {
      // Navigate to separate QC Inspection workspace
      router.push(`/qc/inspection?qrId=${encodeURIComponent(data.qrId)}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Unable to load batch',
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

  // Handle Retest Action from History Table
  const handleRetest = useCallback(
    (item: QcInspectionHistoryItem) => {
      const batchQr = item.finalBatch?.qrId;
      if (!batchQr) {
        toast({
          title: 'Error',
          description: 'Final batch QR ID missing from inspection record.',
          variant: 'destructive',
        });
        return;
      }

      // Navigate to workspace with retest mode
      router.push(`/qc/inspection?qrId=${encodeURIComponent(batchQr)}&retestId=${item.id}`);
    },
    [router]
  );

  return (
    <div className="space-y-6">
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
          </div>
        </div>
      </Card>

      {/* 2. QC Inspection History Section */}
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