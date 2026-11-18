'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  Header,
  PageContainer,
  Card,
} from '@/components/global';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { useMySchedules } from '@/app/(dashboard)/weighing/hooks/useScheduling';
import { Button } from '@/components/ui/button';

export default function OperatorSchedulesPage() {
  const [filters, setFilters] = useState({
    status: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 20,
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortColumn, setSortColumn] = useState<string>('scheduleDate');

  const { data: schedulesData, isLoading, refetch } = useMySchedules(filters);

  const schedules = schedulesData?.schedules ?? [];
  const total = schedulesData?.total ?? 0;
  const totalPages = schedulesData?.totalPages ?? 1;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SUCCESS: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      EXPIRED: 'bg-red-100 text-red-800',
    };
    const className = styles[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {status}
      </span>
    );
  };

  return (
    <PageContainer>
      <Header
        title="My Schedules"
        description="View your assigned execution schedules"
        icon="📅"
      />

      <Card className="mt-6">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="w-[160px]"
                    placeholder="From Date"
                  />
                  <Input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="w-[160px]"
                    placeholder="To Date"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    { key: 'scheduleCode', label: 'Schedule Code' },
                    { key: 'executionCode', label: 'Execution' },
                    { key: 'recipeName', label: 'Recipe' },
                    { key: 'recipeVersion', label: 'Version' },
                    { key: 'scheduleDate', label: 'Schedule Date' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At' },
                  ].map((col) => (
                    <TableHead
                      key={col.key}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortColumn === col.key && (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading schedules...
                    </TableCell>
                  </TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No schedules assigned to you
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow
                      key={schedule.id}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-mono text-sm">{schedule.scheduleCode}</TableCell>
                      <TableCell className="font-medium">{schedule.executionCode}</TableCell>
                      <TableCell>{schedule.recipeName}</TableCell>
                      <TableCell>v{schedule.recipeVersion}</TableCell>
                      <TableCell>
                        {format(new Date(schedule.scheduleDate), 'dd-MM-yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(schedule.createdAt), 'dd-MM-yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
                {Math.min(filters.page * filters.limit, total)} of {total} schedules
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}