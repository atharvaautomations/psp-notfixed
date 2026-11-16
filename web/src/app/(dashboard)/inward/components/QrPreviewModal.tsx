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

export default function QrPreviewModal({ open, onClose, inwardId }: any) {
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [inward, setInward] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0 });
  const [printerStatus, setPrinterStatus] = useState<
    'unknown' | 'connected' | 'disconnected'
  >('unknown');
  const [selectedQrIds, setSelectedQrIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && inwardId) {
      setLoading(true);
      Promise.all([
        api.get(`/inward/${inwardId}/qrs`),
        api.get(`/inward/${inwardId}`),
      ])
        .then(([qrRes, inwardRes]) => {
          setQrCodes(qrRes.data);
          setInward(inwardRes.data);
        })
        .finally(() => setLoading(false));
    } else {
      setQrCodes([]);
      setInward(null);
      setSelectedQrIds(new Set());
    }
  }, [open, inwardId]);

  /**
   * Toggle selection of a QR label
   */
  const toggleSelection = (qrId: string) => {
    const label = qrCodes.find((qr) => qr.qrId === qrId);
    if (!label || label.state === 'CONSUMED') return;

    setSelectedQrIds((prev) => {
      const next = new Set(prev);
      if (next.has(qrId)) {
        next.delete(qrId);
      } else {
        next.add(qrId);
      }
      return next;
    });
  };

  /**
   * Select all QR labels (only non-consumed)
   */
  const selectAll = () => {
    const nonConsumed = qrCodes.filter((qr) => qr.state !== 'CONSUMED');
    setSelectedQrIds(new Set(nonConsumed.map((qr) => qr.qrId)));
  };

  /**
   * Print selected QR labels one by one via backend thermal printer
   */
  const handlePrintSelected = async () => {
    const printable = qrCodes.filter((qr) => qr.state !== 'CONSUMED');
    const selected = printable.filter((qr) => selectedQrIds.has(qr.qrId));
    if (selected.length === 0) {
      toast.error('Please select at least one label to print');
      return;
    }

    try {
      setPrinting(true);
      setPrintProgress({ current: 0, total: selected.length });

      // Send batch request to backend thermal printer
      await api.post('/printer/print-batch', {
        qrCodes: selected.map((qr) => ({ qrId: qr.qrId })),
      });

      toast.success(`${selected.length} label(s) printed successfully`);
      setSelectedQrIds(new Set());
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Print failed');
      console.error('Print error:', error);
    } finally {
      setPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
    }
  };

  /**
   * Print all QR labels one by one via backend thermal printer
   * (excludes consumed labels)
   */
  const handlePrintAll = async () => {
    const printable = qrCodes.filter((qr) => qr.state !== 'CONSUMED');
    if (printable.length === 0) {
      toast.error('No printable labels available (all consumed)');
      return;
    }
    try {
      setPrinting(true);
      setPrintProgress({ current: 0, total: printable.length });

      // Send batch request to backend thermal printer
      await api.post('/printer/print-batch', {
        qrCodes: printable.map((qr) => ({ qrId: qr.qrId })),
      });

      toast.success(`${printable.length} label(s) printed successfully`);
      setSelectedQrIds(new Set());
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Batch print failed');
      console.error('Batch print error:', error);
    } finally {
      setPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
    }
  };

  /**
   * Test printer connection
   */
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

  const isSelected = (qrId: string) => selectedQrIds.has(qrId);

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

          {!loading && qrCodes.length === 0 && (
            <p className="text-center py-6 text-gray-500">No QR codes found.</p>
          )}

          {/* Print Progress */}
          {printing && printProgress.total > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Printing {printProgress.current} of {printProgress.total}...
                </span>
              </div>
            </div>
          )}

          {/* Selection Controls */}
          {qrCodes.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4 flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">
                  Selection:
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={
                    selectedQrIds.size ===
                    qrCodes.filter((qr) => qr.state !== 'CONSUMED').length
                  }
                >
                  Select All
                </Button>
                <span className="text-xs text-gray-500 ml-2">
                  ({selectedQrIds.size} of{' '}
                  {qrCodes.filter((qr) => qr.state !== 'CONSUMED').length}{' '}
                  printable selected)
                </span>
              </div>
            </div>
          )}

          {/* QR Label Labels - Minimal Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-items-start mt-6">
            {qrCodes.map((qr) => (
              <div
                key={qr.qrId}
                id={`qr-${qr.qrId}`}
                className={`relative border rounded-lg p-4 shadow-sm bg-white break-inside-avoid qr-label ${
                  qr.state === 'CONSUMED'
                    ? 'border-red-200 bg-red-50/40 opacity-70 cursor-not-allowed'
                    : isSelected(qr.qrId)
                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500 cursor-pointer'
                    : 'border-gray-300 cursor-pointer'
                }`}
                onClick={() => toggleSelection(qr.qrId)}
              >
                {qr.state === 'CONSUMED' && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-bold text-red-400/70 select-none">
                      ✕
                    </span>
                  </div>
                )}
                {/* Selection Checkbox */}
                <div className="flex justify-end mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected(qr.qrId)}
                    onChange={() => toggleSelection(qr.qrId)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={qr.state === 'CONSUMED'}
                    className={`w-4 h-4 rounded text-green-600 border-gray-300 ${
                      qr.state === 'CONSUMED' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  {qr.state === 'CONSUMED' && (
                    <span className="ml-1 text-[9px] text-red-500 font-medium">
                      Consumed
                    </span>
                  )}
                </div>

                {/* QR Code - Centered */}
                <div className="flex flex-col items-center justify-center mb-3">
                  <QRCode value={qr.qrId} size={80} />
                  <span className="text-[9px] font-mono text-gray-700 break-all text-center mt-1">
                    {qr.qrId}
                  </span>
                </div>

                {/* Info Section - Only 3 fields */}
                <div className="w-full pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-500 uppercase">
                      INW No.
                    </span>
                    <span className="text-[11px] font-bold text-gray-900">
                      {`INW-${String(inward?.id || 0).padStart(5, '0')}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-500 uppercase">
                      Bag No.
                    </span>
                    <span className="text-[11px] font-bold text-gray-900">
                      {`00${qr.bagNo}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 uppercase">
                      GRN No.
                    </span>
                    <span className="text-[11px] font-bold text-gray-900">
                      {inward?.grnNumber || '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={() => onClose(false)}>
            Close
          </Button>
          {qrCodes.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSelected}
                disabled={selectedQrIds.size === 0 || printing || printerStatus !== 'connected'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {printing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Printing...
                  </>
                ) : (
                  `Print Selected (${selectedQrIds.size})`
                )}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handlePrintAll}
                disabled={printing || printerStatus !== 'connected'}
              >
                {printing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Printing...
                  </>
                ) : (
                  `Print All (${qrCodes.filter((q) => q.state !== 'CONSUMED').length})`
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
