'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';

import type {
  QcSpecificationParameter,
  QcInspectionParameterInputDto,
  QcParameterResult,
  QcInspectionFile,
} from '../services/qc.api';

interface QcInspectionTableProps {
  specificationParameters: QcSpecificationParameter[];
  initialParameters?: QcInspectionParameterInputDto[];
  onParametersChange: (parameters: QcInspectionParameterInputDto[]) => void;
  onFileUpload?: (parameterId: number, file: File) => Promise<void>;
  onFileDelete?: (fileId: number) => Promise<void>;
  existingFiles?: Record<number, QcInspectionFile[]>;
  isLoading?: boolean;
  isSubmitting?: boolean;
}

const DEPENDENT_PARAMETER_NAMES = [
  'Rheometer ML',
  'Rheometer MH',
  'Scorch Time TS2',
  'Cure Time TC90',
];

const ELONGATION_NAME = 'Elongation at Break';

export function QcInspectionTable({
  specificationParameters,
  initialParameters = [],
  onParametersChange,
  onFileUpload,
  onFileDelete,
  existingFiles = {},
  isLoading = false,
  isSubmitting = false,
}: QcInspectionTableProps) {
  const [parameters, setParameters] = useState<QcInspectionParameterInputDto[]>(
    initialParameters.length > 0
      ? initialParameters
      : specificationParameters.map((p) => ({
          specificationParameterId: p.id,
          actualValue: undefined,
          result: undefined,
          observations: undefined,
          isEnabled: p.isEnabled ?? true,
        }))
  );
  const [expandedObservations, setExpandedObservations] = useState<Set<number>>(new Set());
  const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set());

  // Identify elongation parameter and dependent parameters
  const elongationParam = useMemo(() =>
    specificationParameters.find(p => p.name === ELONGATION_NAME || p.name.toLowerCase().includes('elongation')),
    [specificationParameters]
  );

  const dependentParamIds = useMemo(() =>
    specificationParameters
      .filter(p => DEPENDENT_PARAMETER_NAMES.includes(p.name))
      .map(p => p.id),
    [specificationParameters]
  );

  const currentElongationEnabled = parameters.find(p =>
    p.specificationParameterId === elongationParam?.id
  )?.isEnabled;

  // Update parameter when changed
  const updateParameter = useCallback((
    paramId: number,
    updates: Partial<QcInspectionParameterInputDto>
  ) => {
    setParameters(prev => prev.map(p =>
      p.specificationParameterId === paramId ? { ...p, ...updates } : p
    ));
  }, []);

  // Handle enable/disable toggle
  const handleEnableToggle = useCallback((paramId: number, enabled: boolean) => {
    setParameters(prev => prev.map(p => {
      if (p.specificationParameterId !== paramId) return p;
      const updated = { ...p, isEnabled: enabled };
      
      // If this is elongation parameter, sync dependent parameters
      if (paramId === elongationParam?.id) {
        if (!enabled) {
          // Disable all dependent parameters
          return { ...updated, actualValue: undefined, result: undefined, observations: undefined };
        }
      }
      // If this is a dependent parameter being manually enabled, ensure elongation is enabled
      const currentElongationEnabled = prev.find(p =>
        p.specificationParameterId === elongationParam?.id
      )?.isEnabled;
      if (dependentParamIds.includes(paramId) && enabled && !currentElongationEnabled) {
        // This shouldn't happen due to UI constraints, but safety check
      }
      return updated;
    }));
    
    // Auto-enable/disable dependent parameters when elongation changes
    if (paramId === elongationParam?.id) {
      setParameters(prev => prev.map(p => {
        if (dependentParamIds.includes(p.specificationParameterId)) {
          return {
            ...p,
            isEnabled: enabled,
            ...(!enabled ? { actualValue: undefined, result: undefined, observations: undefined } : {}),
          };
        }
        return p;
      }));
    }
  }, [elongationParam, dependentParamIds]);

  // Handle file upload
  const handleFileUpload = async (paramId: number, file: File) => {
    if (!onFileUpload) return;
    setUploadingFiles(prev => new Set(prev).add(paramId));
    try {
      await onFileUpload(paramId, file);
      toast({ title: 'File uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', description: 'Failed to upload file', variant: 'destructive' });
    } finally {
      setUploadingFiles(prev => {
        const next = new Set(prev);
        next.delete(paramId);
        return next;
      });
    }
  };

  // Handle file delete
  const handleFileDelete = async (fileId: number) => {
    if (!onFileDelete) return;
    try {
      await onFileDelete(fileId);
      toast({ title: 'File deleted successfully' });
    } catch (error) {
      toast({ title: 'Delete failed', description: 'Failed to delete file', variant: 'destructive' });
    }
  };

  // Notify parent of changes
  const notifyChange = useCallback((updatedParams: QcInspectionParameterInputDto[]) => {
    onParametersChange(updatedParams);
  }, [onParametersChange]);

  // Watch for parameter changes and notify parent
  const prevParametersRef = useRef(parameters);
  useEffect(() => {
    if (prevParametersRef.current !== parameters) {
      notifyChange(parameters);
      prevParametersRef.current = parameters;
    }
  }, [parameters, notifyChange]);

  // Check if parameter is dependent
  const isDependent = (paramId: number) => dependentParamIds.includes(paramId);

  // Check if parameter is elongation
  const isElongation = (paramId: number) => paramId === elongationParam?.id;

  // Get files for parameter
  const getParameterFiles = (paramId: number) => existingFiles[paramId] || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-8 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-8 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-8 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-8 bg-gray-100 rounded animate-pulse w-full" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-16 text-center">Enable</TableHead>
            <TableHead className="w-48">Test Parameter</TableHead>
            <TableHead className="w-40">Test Method</TableHead>
            <TableHead className="w-20">Unit</TableHead>
            <TableHead className="w-52">Specification (Set with tolerance)</TableHead>
            <TableHead className="w-36">Actual Value</TableHead>
            <TableHead className="w-32">Result</TableHead>
            <TableHead className="w-24">Observations</TableHead>
            <TableHead className="w-40">Upload File</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {specificationParameters.map((specParam) => {
            const param = parameters.find(p => p.specificationParameterId === specParam.id);
            const files = getParameterFiles(specParam.id);
            const isDep = isDependent(specParam.id);
            const disabled = isDep && !currentElongationEnabled;

            return (
              <TableRow
                key={specParam.id}
                className={isDep ? 'bg-yellow-50' : ''}
              >
                {/* Enable Checkbox */}
                <TableCell className="text-center">
                  <Checkbox
                    checked={param?.isEnabled ?? true}
                    onCheckedChange={checked => handleEnableToggle(specParam.id, checked as boolean)}
                    disabled={disabled}
                    aria-label={isDep ? 'Enable dependent parameter (requires Elongation at Break enabled)' : 'Enable parameter'}
                  />
                </TableCell>

                {/* Test Parameter */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isElongation(specParam.id) && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Master</span>
                    )}
                    {isDep && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Dependent</span>
                    )}
                    <span className={disabled ? 'text-gray-400' : ''}>
                      {specParam.name}
                    </span>
                  </div>
                </TableCell>

                {/* Test Method */}
                <TableCell className="text-sm text-gray-600">
                  {specParam.testMethod || '—'}
                </TableCell>

                {/* Unit */}
                <TableCell className="text-sm text-gray-600 text-center">
                  {specParam.unit || '—'}
                </TableCell>

                {/* Specification */}
                <TableCell className="text-sm font-mono">
                  {specParam.targetValue !== null && specParam.targetValue !== undefined ? (
                    <>
                      {specParam.targetValue}
                      {specParam.tolerance && (
                        <span className="text-gray-500 ml-1">
                          ±{specParam.tolerance}{specParam.toleranceType === 'PERCENTAGE' ? '%' : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>

                {/* Actual Value */}
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={param?.actualValue?.toString() || ''}
                    onChange={e => updateParameter(specParam.id, {
                      actualValue: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    disabled={disabled || !param?.isEnabled}
                    placeholder="Enter value"
                    className="w-full"
                  />
                </TableCell>

                {/* Result Dropdown */}
                <TableCell>
                  <Select
                    value={param?.result || ''}
                    onValueChange={value => updateParameter(specParam.id, {
                      result: value as QcParameterResult || undefined
                    })}
                    disabled={disabled || !param?.isEnabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">PASS</SelectItem>
                      <SelectItem value="FAIL">FAIL</SelectItem>
                      <SelectItem value="RETEST">RETEST</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* Observations */}
                <TableCell>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start text-left px-2"
                      onClick={() => setExpandedObservations(prev =>
                        new Set(prev).has(specParam.id)
                          ? new Set([...prev].filter(id => id !== specParam.id))
                          : new Set([...prev, specParam.id])
                      )}
                    >
                      {param?.observations ? (
                        <span className="text-blue-600">View</span>
                      ) : (
                        <span className="text-gray-400">Add</span>
                      )}
                    </Button>

                    {expandedObservations.has(specParam.id) && (
                      <div className="absolute z-10 bottom-full left-0 right-0 mb-1 bg-white border rounded-lg shadow-lg p-3 w-72">
                        <Textarea
                          value={param?.observations || ''}
                          onChange={e => updateParameter(specParam.id, {
                            observations: e.target.value
                          })}
                          placeholder="Enter observations for FAIL/RETEST..."
                          rows={3}
                          className="w-full"
                          disabled={disabled || !param?.isEnabled}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => setExpandedObservations(prev => {
                              const next = new Set(prev);
                              next.delete(specParam.id);
                              return next;
                            })}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Upload File */}
                <TableCell>
                  <div className="space-y-2">
                    {files.length > 0 && (
                      <div className="space-y-1">
                        {files.map(file => (
                          <div key={file.id} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
                            <span className="truncate max-w-[120px]">{file.fileName}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileDelete(file.id)}
                              disabled={isSubmitting}
                            >
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      type="file"
                      onChange={e => e.target.files?.[0] && handleFileUpload(specParam.id, e.target.files[0])}
                      disabled={disabled || !param?.isEnabled || uploadingFiles.has(specParam.id)}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full text-sm"
                    />
                    {uploadingFiles.has(specParam.id) && (
                      <div className="text-xs text-blue-600">Uploading...</div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Validation Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Validation Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Parameters: </span>
            <span className="font-medium">{specificationParameters.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Enabled: </span>
            <span className="font-medium text-green-600">
              {parameters.filter(p => p.isEnabled).length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">With Values: </span>
            <span className="font-medium">
              {parameters.filter(p => p.isEnabled && p.actualValue !== undefined).length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">With Results: </span>
            <span className="font-medium">
              {parameters.filter(p => p.isEnabled && p.result).length}
            </span>
          </div>
        </div>
        {parameters.some(p => p.isEnabled && (p.result === 'FAIL' || p.result === 'RETEST') && !p.observations) && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Observations required for FAIL/RETEST results
          </div>
        )}
        {parameters.filter(p => p.isEnabled).some(p => !p.actualValue) && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Some enabled parameters missing actual values
          </div>
        )}
        {parameters.filter(p => p.isEnabled).some(p => !p.result) && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Some enabled parameters missing result selection
          </div>
        )}
      </div>
    </div>
  );
}