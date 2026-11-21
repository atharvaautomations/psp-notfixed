'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface RetestAuditData {
  dateTime: string;
  stage: string;
  deviation: string;
  reason: string;
  actionTaken: string;
  approvedBy: string;
}

interface RetestAuditTableProps {
  initialData?: Partial<RetestAuditData>;
  isRequired?: boolean;
  onDataChange?: (data: RetestAuditData) => void;
  onIsCompleteChange?: (isComplete: boolean) => void;
}

export function RetestAuditTable({
  initialData = {},
  isRequired = false,
  onDataChange,
  onIsCompleteChange,
}: RetestAuditTableProps) {
  const [data, setData] = useState<RetestAuditData>({
    dateTime: initialData.dateTime ?? new Date().toISOString().slice(0, 16),
    stage: initialData.stage ?? '',
    deviation: initialData.deviation ?? '',
    reason: initialData.reason ?? '',
    actionTaken: initialData.actionTaken ?? '',
    approvedBy: initialData.approvedBy ?? '',
  });

  const isComplete =
    data.dateTime.trim() !== '' &&
    data.stage.trim() !== '' &&
    data.deviation.trim() !== '' &&
    data.reason.trim() !== '' &&
    data.actionTaken.trim() !== '' &&
    data.approvedBy.trim() !== '';

  useEffect(() => {
    onIsCompleteChange?.(isComplete);
  }, [isComplete, onIsCompleteChange]);

  const handleChange = (key: keyof RetestAuditData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
    onDataChange?.({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-5 w-5 text-amber-600 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <h3 className="text-base font-semibold text-amber-900">
          Retest Details / Corrective Action Record
        </h3>
        {isRequired && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Mandatory
          </span>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-300 bg-amber-100/50 text-amber-900">
                <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
                <th className="px-4 py-3 text-left font-semibold">Stage</th>
                <th className="px-4 py-3 text-left font-semibold">Deviation</th>
                <th className="px-4 py-3 text-left font-semibold">Reason</th>
                <th className="px-4 py-3 text-left font-semibold">Action Taken</th>
                <th className="px-4 py-3 text-left font-semibold">Approved By</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-amber-700">Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={data.dateTime}
                      onChange={(e) => handleChange('dateTime', e.target.value)}
                      disabled={!isRequired}
                      className={`w-full h-9 bg-white text-sm border rounded ${
                        isRequired && !data.dateTime
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {isRequired && !data.dateTime && (
                      <p className="text-xs text-red-600">Required</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-amber-700">Stage *</Label>
                    <Input
                      value={data.stage}
                      onChange={(e) => handleChange('stage', e.target.value)}
                      placeholder="e.g. Initial Inspection"
                      disabled={!isRequired}
                      className={`w-full h-9 bg-white text-sm border rounded ${
                        isRequired && !data.stage
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {isRequired && !data.stage && (
                      <p className="text-xs text-red-600">Required</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-amber-700">Deviation *</Label>
                    <Input
                      value={data.deviation}
                      onChange={(e) => handleChange('deviation', e.target.value)}
                      placeholder="Describe the deviation"
                      disabled={!isRequired}
                      className={`w-full h-9 bg-white text-sm border rounded ${
                        isRequired && !data.deviation
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {isRequired && !data.deviation && (
                      <p className="text-xs text-red-600">Required</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-amber-700">Reason *</Label>
                    <Input
                      value={data.reason}
                      onChange={(e) => handleChange('reason', e.target.value)}
                      placeholder="Reason for retest"
                      disabled={!isRequired}
                      className={`w-full h-9 bg-white text-sm border rounded ${
                        isRequired && !data.reason
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {isRequired && !data.reason && (
                      <p className="text-xs text-red-600">Required</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-amber-700">Action Taken *</Label>
                    <Input
                      value={data.actionTaken}
                      onChange={(e) => handleChange('actionTaken', e.target.value)}
                      placeholder="Corrective action taken"
                      disabled={!isRequired}
                      className={`w-full h-9 bg-white text-sm border rounded ${
                        isRequired && !data.actionTaken
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {isRequired && !data.actionTaken && (
                      <p className="text-xs text-red-600">Required</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-amber-700">Approved By *</Label>
                    <Input
                      value={data.approvedBy}
                      onChange={(e) => handleChange('approvedBy', e.target.value)}
                      placeholder="Approving authority"
                      disabled={!isRequired}
                      className={`w-full h-9 bg-white text-sm border rounded ${
                        isRequired && !data.approvedBy
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {isRequired && !data.approvedBy && (
                      <p className="text-xs text-red-600">Required</p>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {isRequired && !isComplete && (
          <div className="mt-3 p-3 rounded bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">
              All retest audit fields are mandatory. Please complete them before saving.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RetestAuditTable;