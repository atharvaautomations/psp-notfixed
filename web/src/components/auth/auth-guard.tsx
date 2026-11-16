'use client';

import { ReactNode, useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { canAccess } from '@/config/access-control';
import { getModuleForPath } from '@/config/route-access';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, loading } = useAuth();

  const requiredModule = getModuleForPath(pathname);

  const authorized =
    !requiredModule || (user ? canAccess(user.role, requiredModule) : false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!authorized) {
      router.replace('/');
    }
  }, [user, loading, authorized, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user || !authorized) {
    return null;
  }

  return <>{children}</>;
}
