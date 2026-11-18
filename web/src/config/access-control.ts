import { UserRole } from '@/types/auth';

export type ModuleKey =
  | 'dashboard'
  | 'inventory'
  | 'inward'
  | 'outward'
  | 'requisition'
  | 'outwardHistory'
  | 'history'
  | 'ingredients'
  | 'bins'
  | 'alerts'
  | 'recipes'
  | 'weighing'
  | 'processTracking'
  | 'qc'
  | 'reports'
  | 'qrPreview'
  | 'settings'
  | 'userManagement'
  | 'systemConfig'
  | 'operatorSchedules'
  | 'schedules';

export const ROLE_ACCESS: Record<UserRole, ModuleKey[]> = {
  STORES: [
    'dashboard',
    'inventory',
    'inward',
    'outward',
    'requisition',
    'history',
    'ingredients',
    'bins',
    'alerts',
    'reports',
    'qrPreview',
    'settings',
  ],

  RUBBER_TECHNOLOGIST: [
    'dashboard',
    'inventory',
    'inward',
    'outward',
    'requisition',
    'history',
    'ingredients',
    'bins',
    'alerts',
    'recipes',
    'weighing',
    'processTracking',
    'qc',
    'reports',
    'qrPreview',
    'settings',
    'operatorSchedules',
    'schedules',
  ],

  OPERATOR: ['dashboard', 'weighing', 'processTracking', 'operatorSchedules', 'schedules'],

  QUALITY_CONTROL: [
    'dashboard',
    'inventory',
    'processTracking',
    'qc',
    'requisition',
    'history',
    'reports',
    'qrPreview',
    'alerts',
  ],

  SUPER_ADMIN: [
    'dashboard',
    'inventory',
    'inward',
    'outward',
    'requisition',
    'history',
    'ingredients',
    'bins',
    'alerts',
    'recipes',
    'weighing',
    'processTracking',
    'qc',
    'reports',
    'qrPreview',
    'settings',
    'userManagement',
    'systemConfig',
    'operatorSchedules',
    'schedules',
  ],
};

export function canAccess(role: UserRole, module: ModuleKey) {
  return ROLE_ACCESS[role].includes(module);
}
