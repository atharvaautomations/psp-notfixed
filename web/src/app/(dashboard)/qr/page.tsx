'use client';

import { useState } from 'react';
import { Header, PageContainer } from '@/components/global';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { Search, QrCode } from 'lucide-react';

export default function QrPreviewPage() {
  const [qrId, setQrId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const value = qrId.trim();

    if (!value) {
      setError('Please enter a QR ID.');
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setData(null);

      const response = await api.get(
        `/qr-preview/${encodeURIComponent(value)}`
      );

      setData(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'No record found for this QR ID.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';

    return new Date(value).toLocaleString();
  };

  const formatType = (type: string) => {
    switch (type) {
      case 'INWARD_MATERIAL':
        return 'Inward Material';

      case 'EXECUTION_INGREDIENT':
        return 'Execution Ingredient';

      case 'MASTER_BATCH':
        return 'Master Batch';

      case 'FINAL_BATCH':
        return 'Final Batch';

      default:
        return type;
    }
  };

  const Detail = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-xs text-gray-500">{label}</p>

      <p className="mt-1 text-sm font-medium text-gray-900">{value ?? '-'}</p>
    </div>
  );

  return (
    <PageContainer>
      <Header
        title="QR Preview"
        description="Search and view information associated with any QR code"
        icon="📱"
      />

      {/* Search */}
      <Card className="mt-8 p-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              QR ID
            </label>

            <Input
              value={qrId}
              onChange={(e) => setQrId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="Enter or scan QR ID"
            />
          </div>

          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            <Search className="h-4 w-4" />

            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </Card>

      {/* QR Result */}
      {data && (
        <Card className="mt-6 p-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">QR ID</p>

                <h2 className="text-lg font-semibold text-gray-900">
                  {data.qrId}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium">{formatType(data.type)}</p>

              <span className="mt-1 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {data.status}
              </span>
            </div>
          </div>

          {/* INWARD MATERIAL */}
          {data.type === 'INWARD_MATERIAL' && (
            <div className="mt-6">
              <h3 className="mb-4 font-semibold">Material Details</h3>

              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <Detail label="Material" value={data.materialName} />

                <Detail label="Supplier" value={data.supplierName} />

                <Detail label="Batch Number" value={data.batchNumber} />

                <Detail label="Bag Number" value={data.bagNumber} />

                <Detail
                  label="Bag Weight"
                  value={
                    data.bagWeight != null
                      ? `${data.bagWeight} ${data.unit}`
                      : '-'
                  }
                />

                <Detail
                  label="Total Inward Quantity"
                  value={`${data.inwardQuantity} ${data.unit}`}
                />

                <Detail
                  label="Manufacturing Date"
                  value={formatDate(data.manufacturingDate)}
                />

                <Detail
                  label="Expiry Date"
                  value={formatDate(data.expiryDate)}
                />

                <Detail
                  label="Inward Date"
                  value={formatDate(data.inwardDate)}
                />

                <Detail
                  label="Outward Scanned At"
                  value={formatDate(data.scannedAtOutward)}
                />

                <Detail
                  label="Production Scanned At"
                  value={formatDate(data.scannedAtProduction)}
                />

                <Detail
                  label="Consumed At"
                  value={formatDate(data.consumedAt)}
                />
              </div>

              {data.outward && (
                <>
                  <div className="my-6 border-t" />

                  <h3 className="mb-4 font-semibold">Outward Details</h3>

                  <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                    <Detail label="Outward ID" value={data.outward.outwardId} />

                    <Detail label="Issued To" value={data.outward.issuedTo} />

                    <Detail label="Purpose" value={data.outward.purpose} />

                    <Detail label="Status" value={data.outward.status} />

                    <Detail
                      label="Quantity"
                      value={`${data.outward.quantity} ${data.unit}`}
                    />

                    <Detail
                      label="Outward Date"
                      value={formatDate(data.outward.date)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* EXECUTION INGREDIENT */}
          {data.type === 'EXECUTION_INGREDIENT' && (
            <div className="mt-6">
              <h3 className="mb-4 font-semibold">Ingredient Details</h3>

              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <Detail label="Ingredient Name" value={data.ingredientName} />

                <Detail label="Ingredient Code" value={data.ingredientCode} />

                <Detail label="Material" value={data.materialName} />

                <Detail label="Ingredient Type" value={data.ingredientType} />
              </div>

              <div className="my-6 border-t" />

              <h3 className="mb-4 font-semibold">Execution Details</h3>

              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <Detail label="Execution" value={data.executionCode} />

                <Detail
                  label="Recipe"
                  value={`${data.recipeCode} - ${data.recipeName}`}
                />

                <Detail label="Batch Number" value={data.batchNumber} />

                <Detail label="Batch Type" value={data.batchType} />

                <Detail label="Process" value={data.process} />

                <Detail label="Sequence" value={data.sequence} />
              </div>

              <div className="my-6 border-t" />

              <h3 className="mb-4 font-semibold">Weighing Details</h3>

              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <Detail
                  label="Expected Quantity"
                  value={`${data.expectedQuantity} g`}
                />

                <Detail
                  label="Actual Quantity"
                  value={
                    data.actualQuantity != null
                      ? `${data.actualQuantity} g`
                      : '-'
                  }
                />

                <Detail label="Tolerance" value={`± ${data.tolerance} g`} />

                <Detail label="Weighed At" value={formatDate(data.weighedAt)} />

                <Detail
                  label="Completed At"
                  value={formatDate(data.completedAt)}
                />

                <Detail
                  label="Kneader Scanned"
                  value={data.kneaderScanned ? 'YES' : 'NO'}
                />

                <Detail
                  label="Mixing Scanned"
                  value={data.mixingScanned ? 'YES' : 'NO'}
                />
              </div>
            </div>
          )}

          {/* MASTER BATCH */}
          {data.type === 'MASTER_BATCH' && (
            <div className="mt-6">
              <h3 className="mb-4 font-semibold">Master Batch Details</h3>

              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <Detail label="Execution" value={data.executionCode} />

                <Detail
                  label="Recipe"
                  value={`${data.recipeCode} - ${data.recipeName}`}
                />

                <Detail label="Batch Number" value={data.batchNumber} />

                <Detail label="Status" value={data.status} />

                <Detail label="Created At" value={formatDate(data.createdAt)} />

                <Detail
                  label="Consumed At"
                  value={formatDate(data.consumedAt)}
                />
              </div>
            </div>
          )}

          {/* FINAL BATCH */}
          {data.type === 'FINAL_BATCH' && (
            <div className="mt-6">
              <h3 className="mb-4 font-semibold">Final Batch Details</h3>

              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <Detail label="Execution" value={data.executionCode} />

                <Detail
                  label="Recipe"
                  value={`${data.recipeCode} - ${data.recipeName}`}
                />

                <Detail label="Batch Number" value={data.batchNumber} />

                <Detail label="Status" value={data.status} />

                <Detail label="Created At" value={formatDate(data.createdAt)} />

                <Detail
                  label="Consumed At"
                  value={formatDate(data.consumedAt)}
                />
              </div>
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  );
}
