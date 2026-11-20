'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload,
  FileText,
  X,
  RotateCcw,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';

import type {
  QcSpecificationParameter,
  QcInspectionParameterInputDto,
} from '../services/qc.api';

export interface RowData {
  specificationParameterId: number;
  name: string;
  unit?: string;
  testMethod?: string;
  targetValue?: number;
  tolerance?: number;
  toleranceType?: string;
  isEnabled: boolean;
  isDependent: boolean;
  actualValue: string; // string for input control
  status: 'PASS' | 'FAIL' | ''; // '' means "Select Status"
  remarks: string;
  file?: File | null;
  existingFileName?: string;
}

interface QcInspectionTableProps {
  specificationParameters: QcSpecificationParameter[];
  initialParameters?: QcInspectionParameterInputDto[];
  initialRemarks?: string;
  isRetest?: boolean;
  retestInspectionId?: number | null;
  isSubmitting?: boolean;
  onSave: (
    parameters: QcInspectionParameterInputDto[],
    filesMap: Record<number, File>,
    overallRemarks?: string
  ) => void;
  onReset?: () => void;
}

// Helper to identify Elongation parameter
export const isElongationParam = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('elongation');
};

// Helper to identify the 4 parameters dependent on Elongation
export const isDependentParam = (
  name: string,
  isDependentField?: boolean
): boolean => {
  if (isDependentField) return true;
  const n = name.toLowerCase();
  return (
    n.includes('rheometer') ||
    n.includes('scorch') ||
    n.includes('cure time') ||
    n.includes('ts2') ||
    n.includes('tc90') ||
    n === 'ml' ||
    n === 'mh'
  );
};

export function QcInspectionTable({
  specificationParameters,
  initialParameters = [],
  initialRemarks = '',
  isRetest = false,
  retestInspectionId = null,
  isSubmitting = false,
  onSave,
  onReset,
}: QcInspectionTableProps) {
  const [rows, setRows] = useState<RowData[]>([]);
  const [overallRemarks, setOverallRemarks] = useState(initialRemarks);

  // Sync rows whenever specificationParameters or initialParameters change
  useEffect(() => {
    if (!specificationParameters || specificationParameters.length === 0) {
      setRows([]);
      return;
    }

    // Check if Elongation was enabled in initial parameters (e.g. during retest)
    const initialElongationParam = specificationParameters.find((p) =>
      isElongationParam(p.name)
    );
    const initialElongationEnabled = initialParameters.find(
      (p) => p.specificationParameterId === initialElongationParam?.id
    )?.isEnabled ?? false;

    const newRows: RowData[] = specificationParameters.map((spec) => {
      const isDep = isDependentParam(spec.name, spec.isDependentOnElongation);

      const existing = initialParameters.find(
        (p) => p.specificationParameterId === spec.id
      );

      // Determine initial enabled state:
      // If dependent: auto-enabled if Elongation is enabled, otherwise false
      // If non-dependent: use existing.isEnabled or default to false
      let isEnabled = false;
      if (existing) {
        isEnabled = existing.isEnabled ?? false;
      }
      if (isDep) {
        isEnabled = initialElongationEnabled;
      }

      return {
        specificationParameterId: spec.id,
        name: spec.name,
        unit: spec.unit || '',
        testMethod: spec.testMethod || '',
        targetValue: spec.targetValue,
        tolerance: spec.tolerance,
        toleranceType: spec.toleranceType,
        isEnabled,
        isDependent: isDep,
        actualValue:
          existing?.actualValue !== undefined && existing?.actualValue !== null
            ? String(existing.actualValue)
            : '',
        status:
          existing?.result === 'PASS' || existing?.result === 'FAIL'
            ? existing.result
            : '',
        remarks: existing?.observations || '',
        file: null,
      };
    });

    setRows(newRows);
  }, [specificationParameters, initialParameters]);

  useEffect(() => {
    if (initialRemarks) {
      setOverallRemarks(initialRemarks);
    }
  }, [initialRemarks]);

  // Is Elongation currently enabled?
  const isElongationEnabled = useMemo(() => {
    const elRow = rows.find((r) => isElongationParam(r.name));
    return Boolean(elRow?.isEnabled);
  }, [rows]);

  // Toggle checkbox for a row
  const handleToggleSelect = (paramId: number, checked: boolean) => {
    setRows((prev) => {
      const targetRow = prev.find((r) => r.specificationParameterId === paramId);
      const isTogglingElongation = targetRow && isElongationParam(targetRow.name);

      return prev.map((row) => {
        if (row.specificationParameterId === paramId) {
          return { ...row, isEnabled: checked };
        }
        // When user enables/disables Elongation, auto-enable/disable the dependent rows
        if (isTogglingElongation && row.isDependent) {
          return {
            ...row,
            isEnabled: checked, // Auto-enabled when Elongation checked, disabled when unchecked
          };
        }
        return row;
      });
    });
  };

  // Update actual value
  const handleActualValueChange = (paramId: number, val: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.specificationParameterId === paramId
          ? { ...row, actualValue: val }
          : row
      )
    );
  };

  // Update status dropdown
  const handleStatusChange = (paramId: number, val: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.specificationParameterId === paramId
          ? { ...row, status: val as 'PASS' | 'FAIL' | '' }
          : row
      )
    );
  };

  // Update remarks
  const handleRemarksChange = (paramId: number, val: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.specificationParameterId === paramId
          ? { ...row, remarks: val }
          : row
      )
    );
  };

  // Handle file select
  const handleFileChange = (paramId: number, file: File | null) => {
    if (file) {
      // Validate file format (PDF, JPG, JPEG, PNG)
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExts.includes(ext)) {
        toast({
          title: 'Invalid file format',
          description: 'Supported file types are PDF, JPG, JPEG, and PNG.',
          variant: 'destructive',
        });
        return;
      }

      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10 MB.',
          variant: 'destructive',
        });
        return;
      }
    }

    setRows((prev) =>
      prev.map((row) =>
        row.specificationParameterId === paramId
          ? { ...row, file: file }
          : row
      )
    );
  };

  // Reset functionality
  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset the inspection? This will clear all entered actual values, statuses, uploaded files, and remarks.'
    );
    if (!confirmed) return;

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        isEnabled: false,
        actualValue: '',
        status: '',
        remarks: '',
        file: null,
      }))
    );
    setOverallRemarks('');
    if (onReset) onReset();
    toast({ title: 'Inspection table reset.' });
  };

  // Save / Submit functionality
  const handleSave = () => {
    // Only rows that are currently visible and enabled can be submitted
    // Dependent rows are only visible/enabled when Elongation is enabled
    const activeRows = rows.filter(
      (r) => (!r.isDependent || isElongationEnabled) && r.isEnabled
    );

    // Validation 1: At least one parameter must be selected
    if (activeRows.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one test parameter by checking its checkbox.',
        variant: 'destructive',
      });
      return;
    }

    // Validation 2: Each enabled row must have a valid actual value
    for (const row of activeRows) {
      if (!row.actualValue.trim()) {
        toast({
          title: 'Missing Input / Value',
          description: `Please enter an actual value for "${row.name}".`,
          variant: 'destructive',
        });
        return;
      }

      const numVal = Number(row.actualValue.trim());
      if (isNaN(numVal)) {
        toast({
          title: 'Invalid Input / Value',
          description: `The actual value for "${row.name}" must be a valid number.`,
          variant: 'destructive',
        });
        return;
      }

      // Validation 3: Each enabled row must have a status selected (PASS or FAIL)
      if (!row.status) {
        toast({
          title: 'Missing Status',
          description: `Please select a Status (Pass / Fail) for "${row.name}".`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Build payload only for active submitted parameters
    const submissionParameters: QcInspectionParameterInputDto[] = rows.map((r) => {
      const isIncluded = (!r.isDependent || isElongationEnabled) && r.isEnabled;
      return {
        specificationParameterId: r.specificationParameterId,
        actualValue:
          isIncluded && r.actualValue.trim() ? Number(r.actualValue.trim()) : undefined,
        result: isIncluded && r.status ? (r.status as 'PASS' | 'FAIL') : undefined,
        observations: isIncluded ? r.remarks : undefined,
        isEnabled: isIncluded,
      };
    });

    // Build files map
    const filesMap: Record<number, File> = {};
    rows.forEach((r) => {
      const isIncluded = (!r.isDependent || isElongationEnabled) && r.isEnabled;
      if (isIncluded && r.file) {
        filesMap[r.specificationParameterId] = r.file;
      }
    });

    onSave(submissionParameters, filesMap, overallRemarks);
  };

  if (!specificationParameters || specificationParameters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center bg-gray-50">
        <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-gray-600 font-medium">
          No QC specification parameters configured for this recipe.
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Please configure parameters in QC Specifications first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Retest Banner if in retest mode */}
      {isRetest && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Retest Mode Active:</span> Editing QC Inspection #{retestInspectionId}.
            Please review and re-test the required parameters. Note: This retest can only be performed once.
          </div>
        </div>
      )}

      {/* Section Heading & Description */}
      <div className="border-b border-gray-100 pb-2">
        <h3 className="text-base font-semibold text-gray-900">
          B Label – Enter Actual Test Values
        </h3>
        <p className="mt-0.5 text-sm text-gray-500">
          Select the test parameters you want to enter values for and provide the required details.
        </p>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto rounded-xl border border-blue-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          {/* Light Blue Table Header */}
          <thead>
            <tr className="border-b border-blue-200 bg-[#EBF3FC] text-slate-800">
              <th className="w-16 px-4 py-3.5 text-center font-semibold border-r border-blue-100">
                Select
              </th>
              <th className="min-w-[190px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Test Parameter
              </th>
              <th className="min-w-[180px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Input / Value
              </th>
              <th className="min-w-[150px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Status
              </th>
              <th className="min-w-[200px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Upload File
              </th>
              <th className="min-w-[200px] px-4 py-3.5 font-semibold">
                Remarks
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-150 bg-white">
            {rows.map((row) => {
              // If this is a dependent parameter and Elongation is not enabled, DO NOT display it!
              if (row.isDependent && !isElongationEnabled) {
                return null;
              }

              const fileInputId = `file-input-${row.specificationParameterId}`;
              const isEnabled = row.isEnabled;
              const isDependent = row.isDependent;

              // Row background styling: same as other parameters
              const rowBgClass = isEnabled
                ? 'bg-white hover:bg-blue-50/20'
                : 'bg-gray-50/60 text-gray-400';

              return (
                <tr
                  key={row.specificationParameterId}
                  className={`transition-colors ${rowBgClass}`}
                >
                  {/* 1. Select Column */}
                  <td className="px-4 py-3.5 text-center border-r border-gray-100 align-middle">
                    {isDependent ? (
                      /* No checkbox for the 4 dependent parameters under Elongation per requirement - clean sub-indicator */
                      <div className="flex items-center justify-center" title="Auto-enabled with Elongation">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-50 text-blue-700 font-bold text-xs">
                          ↳
                        </span>
                      </div>
                    ) : (
                      /* Standard checkbox for normal parameters */
                      <div className="flex items-center justify-center">
                        <Checkbox
                          id={`check-${row.specificationParameterId}`}
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleToggleSelect(
                              row.specificationParameterId,
                              Boolean(checked)
                            )
                          }
                          className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </td>

                  {/* 2. Test Parameter */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isDependent && (
                        <span className="text-blue-500 font-bold mr-0.5">↳</span>
                      )}
                      <label
                        htmlFor={!isDependent ? `check-${row.specificationParameterId}` : undefined}
                        className={`font-medium ${
                          isDependent
                            ? 'text-gray-900 cursor-default'
                            : isEnabled
                            ? 'text-gray-900 cursor-pointer'
                            : 'text-gray-500 cursor-pointer'
                        }`}
                      >
                        {row.name}
                      </label>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      {row.testMethod && (
                        <span className="font-mono text-[11px] text-gray-500">
                          {row.testMethod}
                        </span>
                      )}
                      {row.targetValue !== undefined && row.targetValue !== null && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
                          Target: {row.targetValue} {row.unit}
                          {row.tolerance
                            ? ` ±${row.tolerance}${row.toleranceType === 'PERCENTAGE' ? '%' : ''}`
                            : ''}
                        </span>
                      )}
                      {!row.targetValue && row.unit && (
                        <span className="text-gray-400">({row.unit})</span>
                      )}
                    </div>
                  </td>

                  {/* 3. Input / Value */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    <Input
                      type="number"
                      step="any"
                      disabled={!isEnabled}
                      value={row.actualValue}
                      onChange={(e) =>
                        handleActualValueChange(
                          row.specificationParameterId,
                          e.target.value
                        )
                      }
                      placeholder={
                        row.targetValue !== undefined && row.targetValue !== null
                          ? `Enter value (e.g. ${row.targetValue})`
                          : 'Enter value (e.g. 0.2)'
                      }
                      className={`h-9 w-full bg-white transition-all text-sm font-medium ${
                        isEnabled
                          ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          : 'bg-gray-100/70 border-gray-200 text-gray-400 cursor-not-allowed placeholder:text-gray-300'
                      }`}
                    />
                  </td>

                  {/* 4. Status Dropdown */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    <select
                      disabled={!isEnabled}
                      value={row.status}
                      onChange={(e) =>
                        handleStatusChange(
                          row.specificationParameterId,
                          e.target.value
                        )
                      }
                      className={`h-9 w-full rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
                        !isEnabled
                          ? 'bg-gray-100/70 border-gray-200 text-gray-400 cursor-not-allowed'
                          : row.status === 'PASS'
                          ? 'border-green-300 bg-green-50/70 text-green-700 font-semibold focus:border-green-500'
                          : row.status === 'FAIL'
                          ? 'border-red-300 bg-red-50/70 text-red-700 font-semibold focus:border-red-500'
                          : 'border-gray-200 bg-white text-gray-700 focus:border-blue-500'
                      }`}
                    >
                      <option value="" className="text-gray-500 font-normal">
                        Select Status
                      </option>
                      <option value="PASS" className="text-green-700 font-medium">
                        Pass
                      </option>
                      <option value="FAIL" className="text-red-700 font-medium">
                        Fail
                      </option>
                    </select>
                  </td>

                  {/* 5. Upload File */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    <input
                      id={fileInputId}
                      type="file"
                      disabled={!isEnabled}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleFileChange(row.specificationParameterId, file);
                        e.target.value = '';
                      }}
                    />

                    {row.file ? (
                      <div className="flex items-center justify-between gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs text-blue-900 shadow-2xs">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                          <span
                            className="truncate max-w-[120px] font-medium"
                            title={row.file.name}
                          >
                            {row.file.name}
                          </span>
                        </div>
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() =>
                              handleFileChange(row.specificationParameterId, null)
                            }
                            className="rounded p-0.5 text-blue-500 hover:bg-blue-100 hover:text-red-600 transition-colors"
                            title="Remove file"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <label
                        htmlFor={isEnabled ? fileInputId : undefined}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-xs transition-all ${
                          isEnabled
                            ? 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            : 'cursor-not-allowed border-gray-200 bg-gray-100/70 text-gray-400'
                        }`}
                      >
                        <Upload className="h-3.5 w-3.5 text-gray-400" />
                        <span>Choose File</span>
                      </label>
                    )}
                  </td>

                  {/* 6. Remarks */}
                  <td className="px-4 py-3.5 align-middle">
                    <Input
                      type="text"
                      disabled={!isEnabled}
                      value={row.remarks}
                      onChange={(e) =>
                        handleRemarksChange(
                          row.specificationParameterId,
                          e.target.value
                        )
                      }
                      placeholder={isEnabled ? 'Remarks (optional)' : ''}
                      className={`h-9 w-full bg-white text-sm transition-all ${
                        isEnabled
                          ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          : 'bg-gray-100/70 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* General Inspection Remarks (Optional) */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
          General Inspection Remarks (Optional)
        </label>
        <Input
          type="text"
          value={overallRemarks}
          onChange={(e) => setOverallRemarks(e.target.value)}
          placeholder="Enter any additional inspection notes or general observations..."
          className="bg-white border-gray-200 text-sm"
        />
      </div>

      {/* Reset & Save Inspection Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSubmitting}
          className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 gap-1.5"
        >
          <RotateCcw className="h-4 w-4 text-gray-500" />
          <span>Reset</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 shadow-sm gap-2"
          >
            {isSubmitting ? (
              <span>Saving inspection...</span>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                <span>{isRetest ? 'Save Retest' : 'Save Inspection'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
export default QcInspectionTable;
