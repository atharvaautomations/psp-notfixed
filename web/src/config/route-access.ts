import { ModuleKey } from '@/config/access-control';

export const ROUTE_ACCESS: {
  path: string;
  module: ModuleKey;
}[] = [
  { path: '/inventory', module: 'inventory' },
  { path: '/inward', module: 'inward' },
  { path: '/outward', module: 'outward' },
  { path: '/ingredients', module: 'ingredients' },
  { path: '/bins', module: 'bins' },
  { path: '/recipes', module: 'recipes' },
  { path: '/weighing', module: 'weighing' },
  { path: '/process', module: 'processTracking' },
  { path: '/qc', module: 'qc' },
  { path: '/reports', module: 'reports' },
  { path: '/qr', module: 'qrPreview' },
  { path: '/settings', module: 'settings' },
  { path: '/system-config', module: 'systemConfig' },
];

export function getModuleForPath(pathname: string): ModuleKey | null {
  const route = ROUTE_ACCESS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

  return route?.module ?? null;
}
