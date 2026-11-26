'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/global';
import { Button } from '@/components/ui/button';
import { DataTableShell } from '@/components/ui/datatable-shell';
import FilterBar from '@/components/ui/filter-bar';

type WeighingHistoryItem = {
  id: number;
  executionCode: string;
  recipeName: string;
  totalBatches: number;
  status: string;
  createdAt: string;
};

type WeighingFilters = {
  search?: string;
  status?: string;
  sort?: 'asc' | 'desc';
};

export function WeighingHistory() {
  const { data: history = [], isLoading } = useQuery<WeighingHistoryItem[]>({
    queryKey: ['weighing-history'],
    queryFn: async () => {
      const res = await api.get('/weighing/executions');
      return Array.isArray(res.data)
        ? res.data.map((item: any) => ({
          id: item.id,
          executionCode: item.executionCode,
          recipeName: item.recipeName,
          totalBatches: item.totalBatches,
          status: item.status,
          createdAt: item.createdAt,
        }))
        : [];
    },
  });

  const [filters, setFilters] = useState<WeighingFilters>({
    search: '',
    status: 'All',
    sort: 'desc',
  });

  const filteredData = useMemo(() => {
    let result = [...history];

    if (filters.search?.trim()) {
      const search = filters.search!.toLowerCase();
      result = result.filter(
        (item) =>
          item.executionCode.toLowerCase().includes(search) ||
          item.recipeName.toLowerCase().includes(search)
      );
    }

    if (filters.status !== 'All') {
      result = result.filter((item) => item.status === filters.status);
    }

    if (filters.sort) {
      result.sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return filters.sort === 'asc' ? ta - tb : tb - ta;
      });
    }

    return result;
  }, [history, filters]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach((h) => {
      counts[h.status] = (counts[h.status] || 0) + 1;
    });
    return counts;
  }, [history]);

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Weighing History
            </h3>
            <p className="text-sm text-gray-600">
              Track all weighing executions and their status
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Total Executions</p>
            <p className="text-2xl font-bold text-gray-900">
              {history.length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {statusCounts['COMPLETED'] || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {statusCounts['PENDING'] || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">
              {statusCounts['CANCELLED'] || 0}
            </p>
          </div>
        </div>

        <FilterBar
          filters={filters as Record<string, string>}
          setFilters={(updater) => {
            const updated = updater(filters);
            setFilters({
              search: updated.search ?? '',
              status: (updated.status as WeighingFilters['status']) ?? 'All',
              sort: (updated.sort as WeighingFilters['sort']) ?? 'desc',
            });
          }}
        />

        <div className="overflow-x-auto">
          <DataTableShell<WeighingHistoryItem>
            loading={isLoading}
            data={filteredData}
            columns={[
              {
                key: 'executionCode',
                header: 'Execution No.',
                render: (r) => (
                  <div className="font-semibold text-gray-900">
                    {r.executionCode}
                  </div>
                ),
              },
              {
                key: 'recipeName',
                header: 'Recipe',
                render: (r) => (
                  <div className="font-medium text-gray-900">{r.recipeName}</div>
                ),
              },
              {
                key: 'totalBatches',
                header: 'Batches',
                render: (r) => (
                  <span className="text-gray-900">{r.totalBatches}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      r.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {r.status}
                  </span>
                ),
              },
              {
                key: 'createdAt',
                header: 'Created At',
                render: (r) => (
                  <span className="text-gray-600 text-sm">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (_) => (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      View
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {history.length === 0 && !isLoading && (
          <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-4">⚖️</div>
            <p className="text-sm text-gray-500">No weighing history found.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
