'use client';

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

export default function BinActions({ item, onEdit }: any) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onEdit?.(item)}
        title="Edit bin assignment"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
