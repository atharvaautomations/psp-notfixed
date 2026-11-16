'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ArrowRightLeft,
  Layers,
  Boxes,
  BookOpen,
  LineChart,
  CheckSquare,
  FileText,
  QrCode,
  Settings,
  Wrench,
  ClipboardList,
  Bell,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { canAccess, ModuleKey } from '@/config/access-control';

const menu: {
  label: string;
  href: string;
  icon: React.ElementType;
  module: ModuleKey;
}[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: Home,
    module: 'dashboard',
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: Package,
    module: 'inventory',
  },
  {
    label: 'Inward',
    href: '/inward',
    icon: ArrowRightLeft,
    module: 'inward',
  },
  {
    label: 'Outward',
    href: '/outward',
    icon: ArrowRightLeft,
    module: 'outward',
  },
  {
    label: 'Requisition',
    href: '/requisition',
    icon: ClipboardList,
    module: 'requisition',
  },
  {
    label: 'History',
    href: '/history',
    icon: FileText,
    module: 'history',
  },
  {
    label: 'Ingredients',
    href: '/ingredients',
    icon: Layers,
    module: 'ingredients',
  },
  {
    label: 'Bins',
    href: '/bins',
    icon: Boxes,
    module: 'bins',
  },
  {
    label: 'Alerts',
    href: '/alerts',
    icon: Bell,
    module: 'alerts',
  },
  {
    label: 'Recipes',
    href: '/recipes',
    icon: BookOpen,
    module: 'recipes',
  },
  {
    label: 'Weighing',
    href: '/weighing',
    icon: BookOpen,
    module: 'weighing',
  },
  {
    label: 'Process Tracking',
    href: '/process',
    icon: LineChart,
    module: 'processTracking',
  },
  {
    label: 'QC',
    href: '/qc',
    icon: CheckSquare,
    module: 'qc',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: FileText,
    module: 'reports',
  },
  {
    label: 'QR preview',
    href: '/qr',
    icon: QrCode,
    module: 'qrPreview',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    module: 'settings',
  },
  {
    label: 'System Config',
    href: '/system-config',
    icon: Wrench,
    module: 'systemConfig',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user) {
    return null;
  }

  const visibleMenu = menu.filter((item) => canAccess(user.role, item.module));

  return (
    <aside className="w-64 bg-[var(--nav-bg)] text-[var(--nav-text)] flex flex-col border-r border-gray-200 shadow-sm">
      <div className="h-16 flex items-center px-6 text-lg font-semibold border-b border-gray-200">
        MES System
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleMenu.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition gap-3 ${
                  isActive
                    ? 'bg-[var(--nav-active)] text-white font-medium'
                    : 'text-[var(--nav-text)] hover:bg-gray-100 hover:text-black'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
