'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { toast } from '@/components/ui/use-toast';
import { binToDisplay } from '@/utils/bins/bin-mapping';

type EditBinDialogProps = {
  open: boolean;
  onClose: () => void;
  bin: any | null;
};

export default function EditBinDialog({
  open,
  onClose,
  bin,
}: EditBinDialogProps) {
  const qc = useQueryClient();

  const [ingredientId, setIngredientId] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');

  const { data: unassignedIngredients = [] } = useQuery({
    queryKey: ['bins', 'unassigned-ingredients'],

    queryFn: async () => (await api.get('/bins/unassigned-ingredients')).data,

    enabled: open,
  });

  useEffect(() => {
    if (!bin) return;

    setIngredientId(
      bin.ingredientId?.toString() ?? bin.ingredient?.id?.toString() ?? ''
    );

    setMinQuantity(bin.minQuantity?.toString() ?? '');

    setMaxQuantity(bin.maxQuantity?.toString() ?? '');
  }, [bin]);

  const updateBin = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: {
        ingredientId: number;
        minQuantity: number;
        maxQuantity: number;
      };
    }) => {
      return api.patch(`/bins/${id}`, data);
    },

    onSuccess: () => {
      toast({
        title: 'Bin Updated',
        description: 'Bin assignment updated successfully.',
      });

      qc.invalidateQueries({
        queryKey: ['bins'],
      });

      qc.invalidateQueries({
        queryKey: ['bins', 'unassigned-ingredients'],
      });

      onClose();
    },

    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description:
          error?.response?.data?.message || 'Failed to update bin assignment.',
        variant: 'destructive',
      });
    },
  });

  function handleSave() {
    if (!bin) return;

    if (!ingredientId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an ingredient.',
        variant: 'destructive',
      });

      return;
    }

    const min = Number(minQuantity);
    const max = Number(maxQuantity);

    if (min <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Minimum quantity must be greater than 0.',
        variant: 'destructive',
      });

      return;
    }

    if (max <= min) {
      toast({
        title: 'Validation Error',
        description: 'Maximum quantity must be greater than minimum quantity.',
        variant: 'destructive',
      });

      return;
    }

    updateBin.mutate({
      id: bin.id,

      data: {
        ingredientId: Number(ingredientId),
        minQuantity: min,
        maxQuantity: max,
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Edit Bin Assignment</DialogTitle>
        </DialogHeader>

        {bin && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bin Number</Label>

              <Input value={binToDisplay(bin.binNumber)} disabled />

              <p className="text-xs text-gray-500">
                Bin number cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Assigned Ingredient</Label>

              <Select value={ingredientId} onValueChange={setIngredientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>

                <SelectContent>
                  {bin.ingredient && (
                    <SelectItem value={bin.ingredient.id.toString()}>
                      {bin.ingredient.name ||
                        bin.ingredient.materialName ||
                        bin.ingredient.ingredientCode}
                    </SelectItem>
                  )}

                  {unassignedIngredients
                    .filter(
                      (ingredient: any) => ingredient.id !== bin.ingredient?.id
                    )
                    .map((ingredient: any) => (
                      <SelectItem
                        key={ingredient.id}
                        value={ingredient.id.toString()}
                      >
                        {ingredient.name ||
                          ingredient.materialName ||
                          ingredient.ingredientCode}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Minimum Quantity</Label>

              <Input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum Quantity</Label>

              <Input
                type="number"
                value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Current Quantity</Label>

              <Input value={bin.currentQuantity} disabled />

              <p className="text-xs text-gray-500">
                Current quantity is not changed during reassignment.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={updateBin.isPending}>
            {updateBin.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
