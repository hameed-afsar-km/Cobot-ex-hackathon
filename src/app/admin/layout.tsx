import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/LoadingState';
import AdminShell from './AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <LoadingState message="Loading administrative portal..." size="lg" />
      </div>
    }>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
