'use client';

import React, { useState, useEffect, useMemo, useImperativeHandle } from 'react';
import {
  Upload,
  FileText,
  X,
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
  unit: string;
  testMethod: string;
  targetValue?: number;
  tolerance?: number;
  toleranceType?: string;
  specificationText: string;
  isEnabled: boolean;
  isDependent: boolean;
  parentParameter?: string;
  actualValue: string;
  status: 'PASS' | 'FAIL' | '';
  file?: File | null;
  existingFileName?: string;
}

interface QcInspectionTableProps {
  specificationParameters: QcSpecificationParameter[];
  initialParameters?: QcInspectionParameterInputDto[];
  isRetest?: boolean;
  retestInspectionId?: number | null;
  isSubmitting?: boolean;
  onSave: (
    parameters: QcInspectionParameterInputDto[],
    filesMap: Record<number, File>
  ) => void;
  onReset?: () => void;
  showSaveButton?: boolean;
  getFormData?: () => {
    parameters: QcInspectionParameterInputDto[];
    filesMap: Record<number, File>;
  };
}

// Helper to identify Elongation parameter
export const isElongationParam = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('elongation');
};

// Helper to identify Rheometer parent parameter
export const isRheometerParent = (name: string): boolean => {
  const n = name.toLowerCase().trim();
  return n === 'rheometer';
};

// Helper to identify the 4 Rheometer sub-parameters
export const isRheometerSubParam = (name: string): boolean => {
  const n = name.toLowerCase().trim();
  return (
    n === 'rheometer ml' ||
    n === 'rheometer mh' ||
    n === 'scorch time ts2' ||
    n === 'cure time tc90'
  );
};

const QcInspectionTable = React.forwardRef<{ getFormData: () => { parameters: QcInspectionParameterInputDto[]; filesMap: Record<number, File> } }, QcInspectionTableProps>(
  (
    {
      specificationParameters,
      initialParameters = [],
      isRetest = false,
      retestInspectionId = null,
      isSubmitting = false,
      onSave,
      onReset,
      showSaveButton = true,
      getFormData,
    },
    ref
  ) => {
  const [rows, setRows] = useState<RowData[]>([]);

    // Sync rows whenever specificationParameters or initialParameters change
  useEffect(() => {
    if (!specificationParameters || specificationParameters.length === 0) {
      setRows([]);
      return;
    }

    // Check if Rheometer parent was enabled in initial parameters
    const rheometerParent = specificationParameters.find((p) =>
      isRheometerParent(p.name)
    );
    const initialRheometerEnabled = initialParameters.find(
      (p) => p.specificationParameterId === rheometerParent?.id
    )?.isEnabled ?? false;

    const newRows: RowData[] = specificationParameters.map((spec) => {
      const isDep = isRheometerSubParam(spec.name);

      const existing = initialParameters.find(
        (p) => p.specificationParameterId === spec.id
      );

      // Determine initial enabled state:
      // During retest: use existing state from original inspection (locked)
      // During initial: Rheometer sub-params auto-enabled if Rheometer parent is enabled
      let isEnabled = false;
      if (existing) {
        isEnabled = existing.isEnabled ?? false;
      }
      if (isDep && !isRetest) {
        isEnabled = initialRheometerEnabled;
      }

      return {
        specificationParameterId: spec.id,
        name: spec.name,
        unit: existing?.unit ?? '',
        testMethod: existing?.testMethod ?? '',
        targetValue: spec.targetValue,
        tolerance: spec.tolerance,
        toleranceType: spec.toleranceType,
        specificationText: existing?.specificationText ?? '',
        isEnabled,
        isDependent: isDep,
        parentParameter: isDep ? 'Rheometer' : undefined,
        actualValue:
          existing?.actualValue !== undefined && existing?.actualValue !== null
            ? String(existing.actualValue)
            : '',
        status:
          existing?.result === 'PASS' || existing?.result === 'FAIL'
            ? existing.result
            : '',
        file: null,
      };
    });

    setRows(newRows);
  }, [specificationParameters, initialParameters]);

  useImperativeHandle(ref, () => ({
    getFormData: () => {
      const filesMap: Record<number, File> = {};
      rows.forEach((r) => {
        const isIncluded = (!r.isDependent || isRheometerEnabled) && r.isEnabled;
        if (isIncluded && r.file) {
          filesMap[r.specificationParameterId] = r.file;
        }
      });
      return {
        parameters: rows.map((r) => ({
          specificationParameterId: r.specificationParameterId,
          actualValue: r.actualValue !== undefined && r.actualValue !== '' ? r.actualValue : undefined,
          result: r.status || undefined,
          isEnabled: r.isEnabled,
          testMethod: r.testMethod !== undefined && r.testMethod !== '' ? r.testMethod : undefined,
          unit: r.unit !== undefined && r.unit !== '' ? r.unit : undefined,
          specificationText:
            r.specificationText !== undefined && r.specificationText !== ''
              ? r.specificationText
              : undefined,
        })),
        filesMap,
      };
    },
  }));

  // Is Rheometer parent currently enabled?
  const isRheometerEnabled = useMemo(() => {
    const rheometerRow = rows.find((r) => isRheometerParent(r.name));
    return Boolean(rheometerRow?.isEnabled);
  }, [rows]);

  // Toggle checkbox for a row
  const handleToggleSelect = (paramId: number, checked: boolean) => {
    // During retest, parameter selection is locked
    if (isRetest) return;

    setRows((prev) => {
      const targetRow = prev.find((r) => r.specificationParameterId === paramId);
      const isTogglingRheometer = targetRow && isRheometerParent(targetRow.name);

      return prev.map((row) => {
        if (row.specificationParameterId === paramId) {
          return { ...row, isEnabled: checked };
        }
        // When user enables/disables Rheometer parent, auto-enable/disable sub-params
        if (isTogglingRheometer && row.isDependent) {
          return {
            ...row,
            isEnabled: checked,
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

  // Update Test Method input
  const handleTestMethodChange = (paramId: number, val: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.specificationParameterId === paramId
          ? { ...row, testMethod: val }
          : row
      )
    );
  };

  // Update Unit input
  const handleUnitChange = (paramId: number, val: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.specificationParameterId === paramId
          ? { ...row, unit: val }
          : row
      )
    );
  };

  // Update Specification input
  const handleSpecificationChange = (paramId: number, val: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.specificationParameterId === paramId
          ? { ...row, specificationText: val }
          : row
      )
    );
  };

  // Handle file select
  const handleFileChange = (paramId: number, file: File | null) => {
    if (file) {
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
      'Are you sure you want to reset the inspection? This will clear all entered actual values, statuses, and uploaded files.'
    );
    if (!confirmed) return;

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        isEnabled: false,
        actualValue: '',
        status: '',
        file: null,
      }))
    );
    if (onReset) onReset();
    toast({ title: 'Inspection table reset.' });
  };

  // Save / Submit functionality
  const handleSave = () => {
    // Only rows that are currently visible and enabled can be submitted
    const activeRows = rows.filter(
      (r) => (!r.isDependent || isRheometerEnabled) && r.isEnabled
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
    // (Rheometer parent is a category header, not a test parameter)
    for (const row of activeRows) {
      // Skip Rheometer parent - it's a category header, not a measurable parameter
      if (isRheometerParent(row.name)) continue;

      if (!row.actualValue.trim()) {
        toast({
          title: 'Missing Input / Value',
          description: `Please enter an actual value for "${row.name}".`,
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
      const isIncluded = (!r.isDependent || isRheometerEnabled) && r.isEnabled;
      return {
        specificationParameterId: r.specificationParameterId,
        actualValue:
          isIncluded && r.actualValue.trim() ? r.actualValue.trim() : undefined,
        result: isIncluded && r.status ? (r.status as 'PASS' | 'FAIL') : undefined,
        observations: undefined,
        isEnabled: isIncluded,
        testMethod: r.testMethod,
        unit: r.unit,
        specificationText: r.specificationText,
      };
    });

    // Build files map
    const filesMap: Record<number, File> = {};
    rows.forEach((r) => {
      const isIncluded = (!r.isDependent || isRheometerEnabled) && r.isEnabled;
      if (isIncluded && r.file) {
        filesMap[r.specificationParameterId] = r.file;
      }
    });

    onSave(submissionParameters, filesMap);
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

      {/* Section Heading */}
      <div className="border-b border-gray-100 pb-2">
        <h3 className="text-base font-semibold text-gray-900">
          QC Inspection – Enter Actual Test Values
        </h3>
        <p className="mt-0.5 text-sm text-gray-500">
          Select the test parameters you want to enter values for and provide the required details.
        </p>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto rounded-xl border border-blue-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-blue-200 bg-[#EBF3FC] text-slate-800">
              <th className="w-16 px-4 py-3.5 text-center font-semibold border-r border-blue-100">
                Select
              </th>
              <th className="min-w-[180px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Test Parameter
              </th>
              <th className="min-w-[150px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Test Method
              </th>
              <th className="min-w-[120px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Unit
              </th>
              <th className="min-w-[180px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Specification
              </th>
              <th className="min-w-[120px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Actual Value
              </th>
              <th className="min-w-[100px] px-4 py-3.5 font-semibold border-r border-blue-100">
                Result
              </th>
              <th className="min-w-[180px] px-4 py-3.5 font-semibold">
                Upload File
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-150 bg-white">
            {rows.map((row) => {
              // If this is a dependent parameter and Rheometer is not enabled, DO NOT display it!
              if (row.isDependent && !isRheometerEnabled) {
                return null;
              }

              const fileInputId = `file-input-${row.specificationParameterId}`;
              const isEnabled = row.isEnabled;
              const isDependent = row.isDependent;
              const isRheometer = isRheometerParent(row.name);

              // Row background styling: yellow for Rheometer sub-parameters
              const rowBgClass = isRheometer
                ? 'bg-amber-50/40 hover:bg-amber-100/40'
                : isEnabled
                  ? 'bg-white hover:bg-blue-50/20'
                  : 'bg-gray-50/60 text-gray-400';

              return (
                <tr
                  key={row.specificationParameterId}
                  className={`transition-colors ${rowBgClass}`}
                >
                  {/* 1. Select Column */}
                  <td className="px-4 py-3.5 text-center border-r border-gray-100 align-middle">
                    <div className="flex items-center justify-center">
                      {/* Rheometer sub-parameters: no checkbox, auto-enabled via parent */}
                      {isDependent ? null : (
                        <Checkbox
                          id={`check-${row.specificationParameterId}`}
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleToggleSelect(
                              row.specificationParameterId,
                              Boolean(checked)
                            )
                          }
                          disabled={isRetest}
                          className={`h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 ${
                            isRetest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                          }`}
                        />
                      )}
                    </div>
                  </td>

                  {/* 2. Test Parameter */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    <div className="flex items-center gap-1.5">
                      {isDependent && (
                        <span className="text-amber-600 font-bold">↳</span>
                      )}
                      <span
                        className={`font-medium ${
                          isDependent
                            ? 'text-amber-800'
                            : isEnabled
                              ? 'text-gray-900'
                              : 'text-gray-500'
                        }`}
                      >
                        {row.name}
                      </span>
                    </div>
                  </td>

                  {/* 3. Test Method */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    {isRheometer ? (
                      null
                    ) : (
                      <Input
                        type="text"
                        disabled={!isEnabled}
                        value={row.testMethod}
                        onChange={(e) =>
                          handleTestMethodChange(
                            row.specificationParameterId,
                            e.target.value
                          )
                        }
                        placeholder="Test method"
                        className={`h-9 w-full bg-white transition-all text-sm ${
                          isEnabled
                            ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            : 'bg-gray-100/70 border-gray-200 text-gray-400 cursor-not-allowed placeholder:text-gray-300'
                        }`}
                      />
                    )}
                  </td>

                  {/* 4. Unit */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    {isRheometer ? (
                      null
                    ) : (
                      <Input
                        type="text"
                        disabled={!isEnabled}
                        value={row.unit}
                        onChange={(e) =>
                          handleUnitChange(
                            row.specificationParameterId,
                            e.target.value
                          )
                        }
                        placeholder="Unit"
                        className={`h-9 w-full bg-white transition-all text-sm ${
                          isEnabled
                            ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            : 'bg-gray-100/70 border-gray-200 text-gray-400 cursor-not-allowed placeholder:text-gray-300'
                        }`}
                      />
                    )}
                  </td>

                  {/* 5. Specification (set with tolerance) */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    {isRheometer ? (
                      null
                    ) : (
                      <Input
                        type="text"
                        disabled={!isEnabled}
                        value={row.specificationText}
                        onChange={(e) =>
                          handleSpecificationChange(
                            row.specificationParameterId,
                            e.target.value
                          )
                        }
                        placeholder="Specification with tolerance"
                        className={`h-9 w-full bg-white transition-all text-sm ${
                          isEnabled
                            ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            : 'bg-gray-100/70 border-gray-200 text-gray-400 cursor-not-allowed placeholder:text-gray-300'
                        }`}
                      />
                    )}
                  </td>

                  {/* 6. Actual Value */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    {isRheometer ? (
                      null
                    ) : (
                      <Input
                        type="text"
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
                            ? `e.g. ${row.targetValue}`
                            : 'Enter value'
                        }
                        className={`h-9 w-full bg-white transition-all text-sm font-medium ${
                          isEnabled
                            ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            : 'bg-gray-100/70 border-gray-200 text-gray-400 cursor-not-allowed placeholder:text-gray-300'
                        }`}
                      />
                    )}
                  </td>

                  {/* 7. Result */}
                  <td className="px-4 py-3.5 border-r border-gray-100 align-middle">
                    {isRheometer ? (
                      null
                    ) : (
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
                          Select
                        </option>
                        <option value="PASS" className="text-green-700 font-medium">
                          Pass
                        </option>
                        <option value="FAIL" className="text-red-700 font-medium">
                          Fail
                        </option>
                      </select>
                    )}
                  </td>

                  {/* 8. Upload File */}
                  <td className="px-4 py-3.5 align-middle">
                    {isRheometer ? (
                      null
                    ) : (
                      <>
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
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          <span>Reset</span>
        </Button>

        {showSaveButton && (
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
        )}
      </div>
    </div>
  );
});

export default QcInspectionTable;