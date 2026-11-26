'use client';

import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Section } from '@/components/global';
import { Button } from '@/components/ui/button';
import { ExecutionDialog } from './ExecutionDialog';
import { ExecutionTable } from './ExecutionTable';
import { ExecutionItem } from '../types/execution';
import { useExecution, useCreateExecution } from '../hooks/useExecution';
import { useAvailableOperators } from '../hooks/useScheduling';
import ExecutionQrPreviewModal from './ExecutionQrPreviewModal';

export function BulkWeighing() {
  const router = useRouter();
  const { recipes, executions } = useExecution();
  const createExecution = useCreateExecution();
  const { data: operators = [], isLoading: operatorsLoading } =
    useAvailableOperators();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [batchCount, setBatchCount] = useState('1');
  const [productionBatchNumber, setProductionBatchNumber] = useState('');
  const [masterBatchExpiringDate, setMasterBatchExpiringDate] = useState('');
  const [finalBatchExpiringDate, setFinalBatchExpiringDate] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [recipeError, setRecipeError] = useState('');
  const [versionError, setVersionError] = useState('');
  const [batchError, setBatchError] = useState('');
  const [productionBatchError, setProductionBatchError] = useState('');
  const [operatorError, setOperatorError] = useState('');
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionItem | null>(null);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);

  const resetForm = () => {
    setSelectedRecipeId('');
    setSelectedVersionId('');
    setBatchCount('1');
    setProductionBatchNumber('');
    setMasterBatchExpiringDate('');
    setFinalBatchExpiringDate('');
    setOperatorId('');
    setRecipeError('');
    setVersionError('');
    setBatchError('');
    setProductionBatchError('');
    setOperatorError('');
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
      Number.isFinite(parsedBatchCount) && parsedBatchCount >= 1
        ? ''
        : 'Enter a valid number of batches.';
    const nextOperatorError = operatorId ? '' : 'Please select an operator.';

    setRecipeError(nextRecipeError);
    setVersionError(nextVersionError);
    setBatchError(nextBatchError);
    setOperatorError(nextOperatorError);

    if (nextRecipeError || nextVersionError || nextBatchError || nextOperatorError) {
      return;
    }

    createExecution.mutate(
      {
        // The version row id is submitted as recipeId: the backend snapshots
        // that exact version, so no protected execution logic is touched.
        recipeId: Number(trimmedVersionId),
        totalBatches: parsedBatchCount,
        mode: 'BULK',
        operatorId: Number(operatorId),
        productionBatchNumber: productionBatchNumber.trim(),
        masterBatchExpiringDate: masterBatchExpiringDate || undefined,
        finalBatchExpiringDate: finalBatchExpiringDate || undefined,
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
      <div className="flex justify-end gap-2">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => router.push('/schedules')}
        >
          <Calendar size={16} />
          Scheduled Executions
        </Button>
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
        batchCount={batchCount}
        productionBatchNumber={productionBatchNumber}
        masterBatchExpiringDate={masterBatchExpiringDate}
        finalBatchExpiringDate={finalBatchExpiringDate}
        operatorId={operatorId}
        recipeError={recipeError}
        versionError={versionError}
        batchError={batchError}
        productionBatchError={productionBatchError}
        operatorError={operatorError}
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
        onProductionBatchNumberChange={(value) => {
          setProductionBatchNumber(value);
          if (productionBatchError) {
            setProductionBatchError('');
          }
        }}
        onMasterBatchExpiringDateChange={(value) => {
          setMasterBatchExpiringDate(value);
        }}
        onFinalBatchExpiringDateChange={(value) => {
          setFinalBatchExpiringDate(value);
        }}
        onOperatorChange={(value) => {
          setOperatorId(value);
          if (operatorError) {
            setOperatorError('');
          }
        }}
        onSubmit={handleSubmit}
        operators={operators}
        operatorsLoading={operatorsLoading}
      />
      <ExecutionQrPreviewModal
        open={qrPreviewOpen}
        executionId={selectedExecution ? Number(selectedExecution.id) : 0}
        onClose={() => {
          setQrPreviewOpen(false);
          setSelectedExecution(null);
        }}
      />
    </Section>
  );
}
