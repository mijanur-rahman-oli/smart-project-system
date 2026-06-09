// src/app/(dashboard)/layout.tsx
import { MainLayout } from '@/components/layouts/MainLayout';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SocketProvider } from '@/providers/SocketProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <QueryProvider>
        <SocketProvider>
          <MainLayout>{children}</MainLayout>
        </SocketProvider>
      </QueryProvider>
    </AuthProvider>
  );
}