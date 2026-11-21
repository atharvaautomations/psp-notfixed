'use client';
import React from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Printer, ChevronDown, ChevronRight } from 'lucide-react';

import { Header, PageContainer } from '@/components/global';
import { useExecutionTrackingDetail } from '@/hooks/useExecutionTrackingDetail';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function statusBadge(status?: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-700';

    case 'RUNNING':
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700';

    case 'READY':
      return 'bg-cyan-100 text-cyan-700';

    case 'PENDING':
      return 'bg-yellow-100 text-yellow-700';

    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function IngredientCheck({
  ingredient,
  completed,
}: {
  ingredient: any;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <Circle className="h-5 w-5 text-gray-300" />
      )}

      <span
        className={
          completed
            ? 'text-sm font-medium text-gray-900'
            : 'text-sm text-gray-600'
        }
      >
        {ingredient.ingredientCode} - {ingredient.ingredientName}
      </span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full rounded-full bg-blue-500 transition-all"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
        }}
      />
    </div>
  );
}

function ProcessSection({ title, data }: { title: string; data: any }) {
  if (!data) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-gray-900">{title}</h4>

          <p className="mt-1 text-sm text-gray-500">
            Process: {data.processType}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
            data.status
          )}`}
        >
          {data.status}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">Sequence Progress</span>

          <span className="font-medium text-gray-900">
            {data.completedSteps}/{data.totalSteps}
          </span>
        </div>

        <ProgressBar value={data.progress} />

        <p className="mt-1 text-right text-xs text-gray-500">
          {data.progress}%
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-md bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Current Sequence</p>

          <p className="mt-1 font-semibold">
            {data.currentSequence
              ? `${data.currentSequence} of ${data.totalSteps}`
              : '-'}
          </p>
        </div>

        <div className="rounded-md bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Completed Steps</p>

          <p className="mt-1 font-semibold">
            {data.completedSteps} of {data.totalSteps}
          </p>
        </div>

        <div className="rounded-md bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Recipe Written</p>

          <p className="mt-1 font-semibold">
            {data.recipeWritten ? 'YES' : 'NO'}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h5 className="mb-3 text-sm font-semibold text-gray-900">
          Ingredients
        </h5>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {data.ingredients.length === 0 ? (
            <p className="text-sm text-gray-500">No ingredients.</p>
          ) : (
            data.ingredients.map((ingredient: any) => (
              <IngredientCheck
                key={ingredient.id}
                ingredient={ingredient}
                completed={ingredient.completed}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function batchWorkflowLabel(value: string): string {
  switch (value) {
    case 'KNEADER_ONLY':
      return 'Kneader Only';
    case 'KNEADER_AND_MIXING':
      return 'Kneader + Mixing';
    case 'MIXING_FINAL_BATCH':
      return 'Mixing Final Batch';
    case 'MIXING_MASTER_AND_FINAL_BATCH':
      return 'Master + Final Batch';
    default:
      return value;
  }
}

export default function ExecutionTrackingPage() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  const {
    data: execution,
    isLoading,
    isError,
  } = useExecutionTrackingDetail(id);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="p-6 text-sm text-gray-500">Loading execution...</div>
      </PageContainer>
    );
  }

  if (isError || !execution || Array.isArray(execution)) {
    return (
      <PageContainer>
        <div className="p-6">
          <p className="text-sm text-red-500">
            Failed to load execution tracking.
          </p>

          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push('/process')}
          >
            Back to Process Tracking
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header
        title={`Execution ${execution.executionCode}`}
        description={`${execution.recipeCode} - ${execution.recipeName}`}
        icon="🔄"
      />

      <div className="mt-4">
        <Button variant="outline" onClick={() => router.push('/process')}>
          ← Back to Process Tracking
        </Button>
      </div>

      {/* Execution Summary */}
      <Card className="mt-6 p-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Execution</p>

            <p className="mt-1 font-semibold">{execution.executionCode}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Recipe</p>

            <p className="mt-1 font-semibold">{execution.recipeCode}</p>

            <p className="text-xs text-gray-500">{execution.recipeName}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Workflow</p>

            <p className="mt-1 font-semibold">
              {batchWorkflowLabel(execution.workflow)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>

            <span
              className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                execution.status
              )}`}
            >
              {execution.status}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-600">Overall Progress</span>

            <span className="font-medium">
              {execution.completedBatches}/{execution.totalBatches} batches
            </span>
          </div>

          <ProgressBar value={execution.overallProgress} />

          <p className="mt-1 text-right text-xs text-gray-500">
            {execution.overallProgress}%
          </p>
        </div>
      </Card>

      {/* Batches - Collapsible Sections */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Batches</h2>

        <div className="space-y-2">
          {execution.batches.map((batch: any) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

function BatchCard({ batch }: { batch: any }) {
  const [expanded, setExpanded] = React.useState(false);

  async function reprintMasterBatch(qrId: string, batchNumber: number) {
    try {
      await api.post('/printer/mixing/master-batch', {
        qrId,
        batchNumber,
      });

      toast({
        title: 'Print Successful',
        description: `Master Batch QR ${qrId} sent for printing.`,
      });
    } catch (error: any) {
      toast({
        title: 'Print Failed',
        description:
          error?.response?.data?.message || 'Failed to print Master Batch QR.',
        variant: 'destructive',
      });
    }
  }

  async function reprintFinalBatch(qrId: string, batchNumber: number) {
    try {
      await api.post('/printer/mixing/final-batch', {
        qrId,
        batchNumber,
      });

      toast({
        title: 'Print Successful',
        description: `Final Batch QR ${qrId} sent for printing.`,
      });
    } catch (error: any) {
      toast({
        title: 'Print Failed',
        description:
          error?.response?.data?.message || 'Failed to print Final Batch QR.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      {/* Batch Header - Always Visible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Batch {batch.batchNumber}
            </h3>

            <p className="text-sm text-gray-500">
              Current Process: {batch.currentProcess}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
              batch.status
            )}`}
          >
            {batch.status}
          </span>
        </div>

        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {/* Collapsible Content */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-6">
          {/* Batch Overview */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Current Process</p>

              <p className="mt-1 font-semibold">{batch.currentProcess}</p>
            </div>

            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Batch Status</p>

              <p className="mt-1 font-semibold">{batch.status}</p>
            </div>

            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Batch Progress</p>

              <p className="mt-1 font-semibold">
                {batch.weighing?.progress ?? 0}% weighing
              </p>
            </div>
          </div>

          {/* WEIGHING */}
          <div className="mb-6 rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold">Weighing</h4>

                <p className="mt-1 text-sm text-gray-500">
                  {batch.weighing.weighedIngredients} of{' '}
                  {batch.weighing.totalIngredients} ingredients weighed
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                  batch.weighing.status
                )}`}
              >
                {batch.weighing.status}
              </span>
            </div>

            <div className="mt-4">
              <ProgressBar value={batch.weighing.progress} />

              <p className="mt-1 text-right text-xs text-gray-500">
                {batch.weighing.progress}%
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
              {batch.weighing.ingredients.map((ingredient: any) => (
                <IngredientCheck
                  key={ingredient.id}
                  ingredient={ingredient}
                  completed={ingredient.weighed}
                />
              ))}
            </div>
          </div>

          {/* MASTER BATCH */}
          {batch.masterBatch && (
            <div className="mb-6">
              <ProcessSection title="Master Batch" data={batch.masterBatch} />
            </div>
          )}

          {/* FINAL BATCH */}
          {batch.finalBatch && (
            <div className="mb-6">
              <ProcessSection title="Final Batch" data={batch.finalBatch} />
            </div>
          )}

          {/* QR SECTION */}
          <div className="border-t pt-6">
            <h4 className="mb-4 text-base font-semibold">
              Batch QR Codes
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {batch.masterBatch && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-gray-500">
                    Master Batch QR
                  </p>

                  <p className="mt-2 font-medium">
                    {batch.masterBatchQr ?? 'Not generated yet'}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2"
                    disabled={!batch.masterBatchQr}
                    onClick={() => {
                      if (!batch.masterBatchQr) return;

                      reprintMasterBatch(
                        batch.masterBatchQr,
                        batch.batchNumber
                      );
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Re-print Master Batch QR
                  </Button>
                </div>
              )}

              <div className="rounded-lg border p-4">
                <p className="text-xs text-gray-500">
                  Final Batch QR
                </p>

                <p className="mt-2 font-medium">
                  {batch.finalBatchQr ?? 'Not generated yet'}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  disabled={!batch.finalBatchQr}
                  onClick={() => {
                    if (!batch.finalBatchQr) return;

                    reprintFinalBatch(
                      batch.finalBatchQr,
                      batch.batchNumber
                    );
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Re-print Final Batch QR
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}