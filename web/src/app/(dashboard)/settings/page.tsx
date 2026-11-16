'use client';

import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

import { Header, PageContainer, Card, CardContent } from '@/components/global';

import { useAuth } from '@/contexts/auth-context';
import SystemStatusCard from '@/components/settings/SystemStatusCard';

export default function SettingsPage() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <PageContainer>
      <Header
        title="Settings"
        description="System status and application settings"
        icon="⚙️"
      />

      <div className="space-y-6">
        {/* Available to every user */}
        <SystemStatusCard />

        {/* Super Admin only */}
        {isSuperAdmin && (
          <Link href="/settings/users" className="block">
            <Card className="cursor-pointer transition hover:border-blue-200 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        User Management
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        Create users, manage roles, and activate or deactivate
                        user accounts
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </PageContainer>
  );
}
