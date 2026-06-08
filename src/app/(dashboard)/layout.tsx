// src/app/(dashboard)/layout.tsx
import { MainLayout } from '@/components/layouts/MainLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}