'use client';

import { Header, PageContainer } from '@/components/global';
import { useExecutionTracking } from '@/hooks/useExecutionTracking';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ProcessTrackingPage() {
  const router = useRouter();

  const { data: executions = [], isLoading, isError } = useExecutionTracking();

  return (
    <PageContainer>
      <Header
        title="Process Tracking"
        description="Monitor and track all production processes in real-time"
        icon="🔄"
      />

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-4 text-left text-sm font-medium">
                  Execution
                </th>

                <th className="px-6 py-4 text-left text-sm font-medium">
                  Recipe
                </th>

                <th className="px-6 py-4 text-left text-sm font-medium">
                  Workflow
                </th>

                <th className="px-6 py-4 text-center text-sm font-medium">
                  Batches
                </th>

                <th className="px-6 py-4 text-left text-sm font-medium">
                  Progress
                </th>

                <th className="px-6 py-4 text-left text-sm font-medium">
                  Status
                </th>

                <th className="px-6 py-4 text-right text-sm font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    Loading executions...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-red-500"
                  >
                    Failed to load executions.
                  </td>
                </tr>
              ) : executions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No executions found.
                  </td>
                </tr>
              ) : (
                executions.map((execution: any) => (
                  <tr
                    key={execution.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium">
                      {execution.executionCode}
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">
                          {execution.recipeCode}
                        </div>

                        <div className="text-xs text-gray-500">
                          {execution.recipeName}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {execution.workflow === 'MIXING_MASTER_AND_FINAL_BATCH'
                        ? 'Master Batch + Final Batch'
                        : execution.workflow}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {execution.completedBatches}/{execution.totalBatches}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${execution.progress}%`,
                            }}
                          />
                        </div>

                        <span className="text-sm">{execution.progress}%</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                        {execution.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/process/${execution.id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
