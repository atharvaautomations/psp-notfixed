// src/app/(dashboard)/layout.tsx
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />

          <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
