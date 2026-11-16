'use client';

import { useState } from 'react';
import { Header, PageContainer, Card } from '@/components/global';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import type { Ingredient } from '@/types/ingredients';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

export default function AddIngredientPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    ingredientCode: '',
    name: '',
    type: '',
    customType: '',
    materialName: '',
  });

  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/inward/materials');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const res = await api.get('/ingredients');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const assignedMaterials = ingredients.map(
    (ing: Ingredient) => ing.materialName
  );
  const availableMaterials = materials.filter(
    (m: string) => !assignedMaterials.includes(m)
  );

  const { mutateAsync: createIngredient, isPending } = useMutation({
    mutationFn: (data: any) => api.post('/ingredients', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] });
      toast({ title: 'Ingredient added successfully!' });
      router.push('/ingredients');
    },
    onError: (err: any) => {
      toast({
        title: 'Error adding ingredient',
        description: err.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const handleChange = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));
  const handleSubmit = async () => {
    if (
      !formData.ingredientCode.trim() ||
      !formData.name.trim() ||
      !formData.materialName ||
      !formData.type
    ) {
      toast({
        title: 'Missing Fields',
        description:
          'Please fill in Ingredient Code, Ingredient Name, Type, and select a Material.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'OTHER' && !formData.customType.trim()) {
      toast({
        title: 'Missing Custom Type',
        description:
          'Please enter a custom ingredient type when Other is selected.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      ingredientCode: formData.ingredientCode.trim(),
      name: formData.name.trim(),
      type: formData.type,
      customType: formData.type === 'OTHER' ? formData.customType.trim() : null,
      materialName: formData.materialName,
    };

    await createIngredient(payload);
  };

  // Ingredient types
  const ingredientTypes = [
    { label: 'Base Polymer', value: 'BASE_POLYMER' },
    { label: 'Filler', value: 'FILLER' },
    { label: 'Activator', value: 'ACTIVATOR' },
    { label: 'Accelerator', value: 'ACCELERATOR' },
    { label: 'Curing Agent', value: 'CURING_AGENT' },
    { label: 'Processing Aid', value: 'PROCESSING_AID' },
    { label: 'Pigment', value: 'PIGMENT' },
    { label: 'Other', value: 'OTHER' },
  ];

  return (
    <PageContainer>
      <Header
        title="Add Ingredient"
        description="Create a new ingredient for use in recipes"
        icon="🧪"
      />

      <div className="mt-8 max-w-2xl">
        <Card>
          <div className="space-y-6">
            {/* Ingredient Code */}
            <div>
              <Label className="text-gray-900 font-medium">
                Ingredient Code <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., IN001"
                value={formData.ingredientCode}
                onChange={(e) => handleChange('ingredientCode', e.target.value)}
                className="mt-2 bg-white border-gray-200"
              />
            </div>

            {/* Ingredient Name */}
            <div>
              <Label className="text-gray-900 font-medium">
                Ingredient Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., Zinc Oxide"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-2 bg-white border-gray-200"
              />
            </div>

            {/* Ingredient Type */}
            <div>
              <Label className="text-gray-900 font-medium">
                Ingredient Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(v) => {
                  setFormData((prev) => ({
                    ...prev,
                    type: v,
                    customType: v === 'OTHER' ? prev.customType : '',
                  }));
                }}
              >
                <SelectTrigger className="mt-2 bg-white border-gray-200">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {ingredientTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.type === 'OTHER' && (
              <div>
                <Label className="text-gray-900 font-medium">
                  Custom Ingredient Type <span className="text-red-500">*</span>
                </Label>

                <Input
                  placeholder="e.g., Processing Chemical"
                  value={formData.customType}
                  onChange={(e) => handleChange('customType', e.target.value)}
                  className="mt-2 bg-white border-gray-200"
                />
              </div>
            )}

            {/* Material Dropdown */}
            <div>
              <Label className="text-gray-900 font-medium">
                Material <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.materialName}
                onValueChange={(v) => handleChange('materialName', v)}
                disabled={loadingMaterials}
              >
                <SelectTrigger className="mt-2 bg-white border-gray-200">
                  <SelectValue
                    placeholder={
                      loadingMaterials
                        ? 'Loading materials...'
                        : availableMaterials.length > 0
                        ? 'Select material'
                        : 'No unassigned materials'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {availableMaterials.map((m: any, i: number) => (
                    <SelectItem key={i} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => router.push('/ingredients')}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
