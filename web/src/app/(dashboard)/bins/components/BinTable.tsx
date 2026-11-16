'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import BinActions from './BinActions';
import EditBinDialog from './EditBinDialog';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { binToDisplay } from '@/utils/bins/bin-mapping';

export default function BinTable() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedBin, setSelectedBin] = useState<any | null>(null);

  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(bin: any) {
    setSelectedBin(bin);
    setEditOpen(true);
  }

  const { data: bins = [], isLoading } = useQuery({
    queryKey: ['bins'],
    queryFn: async () => (await api.get('/bins')).data,
  });

  if (isLoading) return <p className="text-gray-500">Loading bins...</p>;
  if (!bins.length) return <p className="text-gray-500">No bins found.</p>;

  const totalPages = Math.ceil(bins.length / itemsPerPage);
  const visibleData = bins.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Bin No</TableHead>
            <TableHead>Ingredient</TableHead>
            <TableHead>Min Qty</TableHead>
            <TableHead>Max Qty</TableHead>
            <TableHead>Current Qty</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {visibleData.map((bin: any) => (
            <TableRow key={bin.id}>
              <TableCell>{bin.id}</TableCell>
              <TableCell className="font-medium">
                {binToDisplay(bin.binNumber)}
              </TableCell>
              <TableCell>{bin.ingredient?.materialName || '-'}</TableCell>
              <TableCell>{bin.minQuantity}</TableCell>
              <TableCell>{bin.maxQuantity}</TableCell>
              <TableCell>{bin.currentQuantity}</TableCell>
              <TableCell>
                {new Date(bin.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="flex justify-center space-x-2">
                <BinActions item={bin} onEdit={handleEdit} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex gap-1 items-center mt-2 justify-center">
        {/* Previous */}
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>

        {/* Page numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => {
            if (p === 1 || p === totalPages) return true;
            if (Math.abs(p - page) <= 1) return true;
            return false;
          })
          .map((p, idx, arr) => {
            const prev = arr[idx - 1];
            const showDots = prev && p - prev > 1;
            return (
              <React.Fragment key={p}>
                {showDots && <span className="px-2 text-gray-500">...</span>}
                <Button
                  size="sm"
                  variant={page === p ? 'default' : 'outline'}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              </React.Fragment>
            );
          })}

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      <EditBinDialog
        open={editOpen}
        bin={selectedBin}
        onClose={() => {
          setEditOpen(false);
          setSelectedBin(null);
        }}
      />
    </div>
  );
}
