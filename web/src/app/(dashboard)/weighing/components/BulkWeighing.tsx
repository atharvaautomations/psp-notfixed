'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Section } from '@/components/global';
import { Button } from '@/components/ui/button';
import { ExecutionDialog } from './ExecutionDialog';
import { ExecutionTable } from './ExecutionTable';
import { ExecutionItem } from '../types/execution';
import { useExecution, useCreateExecution } from '../hooks/useExecution';
import ExecutionQrPreviewModal from './ExecutionQrPreviewModal';

export function BulkWeighing() {
  const { recipes, executions } = useExecution();
  const createExecution = useCreateExecution();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [batchCount, setBatchCount] = useState('1');
  const [recipeError, setRecipeError] = useState('');
  const [versionError, setVersionError] = useState('');
  const [batchError, setBatchError] = useState('');
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionItem | null>(null);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);

  const resetForm = () => {
    setSelectedRecipeId('');
    setSelectedVersionId('');
    setBatchCount('1');
    setRecipeError('');
    setVersionError('');
    setBatchError('');
  };

  const handleSubmit = () => {
    const trimmedVersionId = selectedVersionId.trim();
    const parsedBatchCount = Number(batchCount);

    const nextRecipeError = selectedRecipeId.trim()
      ? ''
      : 'Recipe is required.';
    const nextVersionError = trimmedVersionId
      ? ''
      : 'Select a recipe version.';
    const nextBatchError =
      Number.isFinite(parsedBatchCount) && parsedBatchCount > 0
        ? ''
        : 'Number of batches must be greater than 0.';

    setRecipeError(nextRecipeError);
    setVersionError(nextVersionError);
    setBatchError(nextBatchError);

    if (nextRecipeError || nextVersionError || nextBatchError) {
      return;
    }

    createExecution.mutate(
      {
        // The version row id is submitted as recipeId: the backend snapshots
        // that exact version, so no protected execution logic is touched.
        recipeId: Number(trimmedVersionId),
        totalBatches: parsedBatchCount,
        mode: 'BULK',
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handlePrintAll = (execution: ExecutionItem) => {
    setSelectedExecution(execution);
    setQrPreviewOpen(true);
  };

  const handlePrintBatch = (execution: ExecutionItem) => {
    console.log('Print batch QR', execution);
  };

  const handleEdit = (execution: ExecutionItem) => {
    console.log('Edit execution', execution);
  };

  const handleDelete = (execution: ExecutionItem) => {
    console.log('Delete execution', execution);
  };

  return (
    <Section
      title="Bulk Weighing"
      description="Create and manage bulk weighing executions"
    >
      <div className="flex justify-end">
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus size={16} />
          Create Execution
        </Button>
      </div>

      <div className="mt-6">
        <ExecutionTable
          executions={executions}
          onPrintAll={handlePrintAll}
          onPrintBatch={handlePrintBatch}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <ExecutionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        recipes={recipes}
        selectedRecipeId={selectedRecipeId}
        selectedVersionId={selectedVersionId}
        batchCount={Number(batchCount)}
        recipeError={recipeError}
        versionError={versionError}
        batchError={batchError}
        onRecipeChange={(value) => {
          setSelectedRecipeId(value);
          setSelectedVersionId('');
          if (recipeError) {
            setRecipeError('');
          }
        }}
        onVersionChange={(value) => {
          setSelectedVersionId(value);
          if (versionError) {
            setVersionError('');
          }
        }}
        onBatchCountChange={(value) => {
          setBatchCount(value);
          if (batchError) {
            setBatchError('');
          }
        }}
        onSubmit={handleSubmit}
      />
      <ExecutionQrPreviewModal
        open={qrPreviewOpen}
        executionId={selectedExecution?.id}
        onClose={() => {
          setQrPreviewOpen(false);
          setSelectedExecution(null);
        }}
      />
    </Section>
  );
}
