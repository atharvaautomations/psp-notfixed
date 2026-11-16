'use client';

import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import NotificationButton from '@/components/notifications/NotificationButton';

function formatRole(role: string) {
  return role
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm">
      <div className="flex-1 text-sm text-gray-600">Dashboard</div>

      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>

            <div className="leading-tight">
              <div className="text-sm font-medium text-gray-900">
                {user.name}
              </div>

              <div className="text-xs text-gray-500">
                {formatRole(user.role)}
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200" />

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>

          <NotificationButton />
        </div>
      )}
    </header>
  );
}
