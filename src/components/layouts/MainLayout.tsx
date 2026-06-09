// src/components/layouts/MainLayout.tsx
'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, checkAuth } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    checkAuth();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (!isClient || isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}