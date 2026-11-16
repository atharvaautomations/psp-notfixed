'use client';

import { UNIT_FILTER_OPTIONS, UnitFilter } from '@/hooks/useInventory';

type UnitFilterSelectProps = {
  value: UnitFilter;
  onChange: (value: UnitFilter) => void;
  className?: string;
};

export function UnitFilterSelect({
  value,
  onChange,
  className = '',
}: UnitFilterSelectProps) {
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600">Unit Filter</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as UnitFilter)}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {UNIT_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
