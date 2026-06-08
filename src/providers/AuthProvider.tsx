// src/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  demoLogin: (role: 'admin' | 'project_manager' | 'team_member') => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();

  useEffect(() => {
    // Only redirect after auth is initialized
    if (!auth.isLoading) {
      // If not authenticated and on a protected page
      if (!auth.isAuthenticated && !PUBLIC_PATHS.includes(pathname || '')) {
        router.push(`/login?redirect=${pathname}`);
      }
      // If authenticated and on a public page
      if (auth.isAuthenticated && PUBLIC_PATHS.includes(pathname || '')) {
        router.push('/dashboard');
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, pathname, router]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}