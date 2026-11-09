// src/app/admin/AdminShell.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { LoadingState } from '@/components/shared/LoadingState';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, adminUser, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === '/admin/login';

  useEffect(() => {
    if (loading || isLoginRoute) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    if (!isAdmin) {
      router.replace('/admin/login?error=unauthorized');
    }
  }, [user, isAdmin, loading, router, isLoginRoute]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  const hasAccess = !loading && !!user && isAdmin;

  return (
    <div className="min-h-screen bg-[#090909] flex">
      {hasAccess && <AdminSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {hasAccess && <AdminHeader adminUser={adminUser} />}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090909]">
          <LoadingState message="Verifying administrative access..." size="lg" />
        </div>
      )}

      {!loading && !hasAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090909]">
          <LoadingState message="Redirecting to sign in..." size="lg" />
        </div>
      )}
    </div>
  );
}
