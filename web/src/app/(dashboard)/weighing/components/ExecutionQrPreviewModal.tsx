'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface FinalBatchQR {
  id: number;
  qrId: string;
  batchNumber: number;
  recipeCode: string;
  recipeName: string;
  shift: string;
  expiryDate: string | null;
  mixingCompletedAt: string | null;
  status: string;
}

export default function QrPreviewModal({ open, onClose, executionId }: { open: boolean; onClose: (open: boolean) => void; executionId: number }) {
  const [execution, setExecution] = useState<any>(null);
  const [finalBatches, setFinalBatches] = useState<FinalBatchQR[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<
    'unknown' | 'connected' | 'disconnected'
  >('unknown');
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'final-batch'>('ingredients');

  useEffect(() => {
    if (open && executionId) {
      setLoading(true);
      Promise.all([
        api.get(`/executions/${executionId}/qrs`).then(res => res.data),
        api.get(`/weighing/executions/${executionId}/final-batch-qrs`).then(res => res.data),
      ])
        .then(([execData, fbData]) => {
          setExecution(execData);
          setFinalBatches(fbData);
        })
        .finally(() => setLoading(false));
    }
  }, [open, executionId]);

  const currentBatch = execution?.batches?.[selectedBatch] ?? null;

  const handlePrintSingle = async (qrId: string) => {
    try {
      setPrinting(true);
      await api.post('/printer/weighing/print', { qrId });
      toast.success('Label printed successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Print failed');
      console.error('Print error:', error);
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintCurrentBatch = async () => {
    if (!currentBatch) return;

    try {
      setPrinting(true);

      await api.post('/printer/weighing/print-batch', {
        qrCodes: currentBatch.ingredients.map((ingredient: any) => ({
          qrId: ingredient.qrId,
        })),
      });

      toast.success(`Batch ${currentBatch.batchNumber} printed successfully`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Batch print failed');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintByType = async (stepType: 'KNEADER' | 'MIXING') => {
    if (!currentBatch) return;

    const filteredIngredients = currentBatch.ingredients.filter(
      (ingredient: any) => ingredient.stepType === stepType
    );

    if (!filteredIngredients.length) {
      toast.error(
        `No ${stepType.toLowerCase()} QR codes found for batch ${
          currentBatch.batchNumber
        }`
      );
      return;
    }

    try {
      setPrinting(true);

      await api.post('/printer/weighing/print-batch', {
        qrCodes: filteredIngredients.map((ingredient: any) => ({
          qrId: ingredient.qrId,
        })),
      });

      toast.success(
        `Batch ${
          currentBatch.batchNumber
        } ${stepType.toLowerCase()} labels printed successfully`
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Batch print failed');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintFinalBatch = async (fb: FinalBatchQR) => {
    try {
      setPrinting(true);
      await api.post('/printer/mixing/final-batch', {
        qrId: fb.qrId,
        recipeCode: fb.recipeCode,
        batchNumber: fb.batchNumber,
      });
      toast.success(`Final Batch label printed for ${fb.qrId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Final Batch print failed');
      console.error('Final Batch print error:', error);
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintAllFinalBatches = async () => {
    if (!finalBatches.length) return;

    try {
      setPrinting(true);
      for (const fb of finalBatches) {
        await api.post('/printer/mixing/final-batch', {
          qrId: fb.qrId,
          recipeCode: fb.recipeCode,
          batchNumber: fb.batchNumber,
        });
      }
      toast.success(`All ${finalBatches.length} Final Batch labels printed`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Final Batch print failed');
    } finally {
      setPrinting(false);
    }
  };

  const handleTestPrinter = async () => {
    try {
      const response = await api.get('/printer/status');
      if (response.data.connected) {
        console.log('Printer status:', response.data);
        setPrinterStatus('connected');
        toast.success('Printer is connected and ready');
      } else {
        console.log('Printer status:', response.data);
        setPrinterStatus('disconnected');
        toast.error('Printer not connected: ' + response.data.error);
      }
    } catch (error) {
      setPrinterStatus('disconnected');
      toast.error('Cannot connect to printer service');
    }
  };

  const kneaderQrCount =
    currentBatch?.ingredients.filter(
      (ingredient: any) => ingredient.stepType === 'KNEADER'
    ).length ?? 0;

  const mixingQrCount =
    currentBatch?.ingredients.filter(
      (ingredient: any) => ingredient.stepType === 'MIXING'
    ).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-white shadow-xl rounded-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center">
            QR Print Preview
          </DialogTitle>
        </DialogHeader>

        {/* Printer Status */}
        <div className="px-4 py-2 bg-gray-50 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                printerStatus === 'connected'
                  ? 'bg-green-500'
                  : printerStatus === 'disconnected'
                  ? 'bg-red-500'
                  : 'bg-gray-400'
              }`}
            />

            <span className="text-sm font-medium text-gray-700">
              Printer Status:
            </span>

            <span
              className={`text-sm font-semibold ${
                printerStatus === 'connected'
                  ? 'text-green-600'
                  : printerStatus === 'disconnected'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {printerStatus === 'connected'
                ? 'Connected'
                : printerStatus === 'disconnected'
                ? 'Not Connected'
                : 'N/A'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPrinter}
            disabled={printing}
          >
            Test Connection
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {loading && (
            <p className="text-center py-6 text-gray-500">Loading...</p>
          )}

          {!loading && !execution && (
            <p className="text-center py-6 text-gray-500">No QR codes found.</p>
          )}

          {printing && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Printing labels...
                </span>
              </div>
            </div>
          )}

          {execution ? (
            <>
              {/* Tab Navigation */}
              <div className="flex gap-2 mb-4 border-b pb-2">
                <Button
                  variant={activeTab === 'ingredients' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('ingredients')}
                  className="text-sm"
                >
                  Ingredient Labels
                </Button>
                <Button
                  variant={activeTab === 'final-batch' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('final-batch')}
                  className="text-sm"
                >
                  Final Batch Labels ({finalBatches.length})
                </Button>
              </div>

              {activeTab === 'ingredients' && (
                <>
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {execution.batches.map((batch: any, index: number) => (
                      <Button
                        key={batch.id}
                        variant={selectedBatch === index ? 'default' : 'outline'}
                        onClick={() => setSelectedBatch(index)}
                      >
                        Batch {batch.batchNumber}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {currentBatch?.ingredients.map((ingredient: any) => (
                      <div
                        key={ingredient.id}
                        className="border rounded-lg p-4 flex flex-col items-center"
                      >
                        <QRCode value={ingredient.qrId} size={110} />

                        <p className="mt-3 text-xs font-mono text-center break-all">
                          {ingredient.qrId}
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {(ingredient.stepType || 'UNKNOWN').toUpperCase()} |{' '}
                          {ingredient.ingredientCode}
                        </p>

                        <p className="text-xs text-gray-500">
                          {ingredient.quantity} g
                        </p>

                        <Button
                          className="mt-3 w-full"
                          variant="outline"
                          onClick={() => handlePrintSingle(ingredient.qrId)}
                          disabled={printing || printerStatus !== 'connected'}
                        >
                          Print
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'final-batch' && (
                <div>
                  {finalBatches.length === 0 ? (
                    <p className="text-center py-6 text-gray-500">No Final Batch QR codes found.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {finalBatches.map((fb) => (
                          <div
                            key={fb.id}
                            className="border rounded-lg p-4 flex flex-col items-center"
                          >
                            <QRCode value={fb.qrId} size={110} />

                            <p className="mt-3 text-xs font-mono text-center break-all">
                              {fb.qrId}
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              Batch {fb.batchNumber} | {fb.recipeCode}
                            </p>

                            <p className="text-xs text-gray-500">
                              Shift: {fb.shift}
                            </p>

                            <p className="text-xs text-gray-500">
                              Expiry: {fb.expiryDate ? new Date(fb.expiryDate).toLocaleDateString() : 'N/A'}
                            </p>

                            <p className="text-xs text-gray-500">
                              Mixing: {fb.mixingCompletedAt ? new Date(fb.mixingCompletedAt).toLocaleString() : 'N/A'}
                            </p>

                            <Button
                              className="mt-3 w-full"
                              variant="outline"
                              onClick={() => handlePrintFinalBatch(fb)}
                              disabled={printing || printerStatus !== 'connected'}
                            >
                              Print FB Label
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="mt-4 w-full sm:w-auto"
                        variant="default"
                        onClick={handlePrintAllFinalBatches}
                        disabled={printing || printerStatus !== 'connected' || finalBatches.length === 0}
                      >
                        Print All Final Batch Labels
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex justify-center gap-4 mt-6 flex-wrap">
          <Button variant="outline" onClick={() => onClose(false)}>
            Close
          </Button>

          {activeTab === 'ingredients' && currentBatch && (
            <>
              <Button
                variant="outline"
                onClick={handlePrintCurrentBatch}
                disabled={printing || printerStatus !== 'connected'}
              >
                Print Batch {currentBatch.batchNumber}
              </Button>

              <Button
                variant="outline"
                onClick={() => handlePrintByType('KNEADER')}
                disabled={
                  printing ||
                  printerStatus !== 'connected' ||
                  kneaderQrCount === 0
                }
              >
                Print Kneader ({kneaderQrCount})
              </Button>

              <Button
                variant="outline"
                onClick={() => handlePrintByType('MIXING')}
                disabled={
                  printing ||
                  printerStatus !== 'connected' ||
                  mixingQrCount === 0
                }
              >
                Print Mixing ({mixingQrCount})
              </Button>
            </>
          )}

          {activeTab === 'final-batch' && finalBatches.length > 0 && (
            <Button
              variant="default"
              onClick={handlePrintAllFinalBatches}
              disabled={printing || printerStatus !== 'connected'}
            >
              Print All Final Batch Labels
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}