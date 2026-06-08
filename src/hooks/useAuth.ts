// src/hooks/useAuth.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'project_manager' | 'team_member';
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  demoLogin: (role: 'admin' | 'project_manager' | 'team_member') => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<boolean>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (email, password, rememberMe) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.login(email, password, rememberMe);
          if (response.success && response.data) {
            set({ 
              user: response.data.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: response.error || 'Login failed' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      register: async (name, email, password, confirmPassword) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.register(name, email, password, confirmPassword);
          if (response.success) {
            set({ isLoading: false });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: response.error || 'Registration failed' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiClient.logout();
          set({ user: null, isAuthenticated: false, isLoading: false });
          window.location.href = '/login';
        } catch (error) {
          set({ isLoading: false });
        }
      },

      demoLogin: async (role) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.demoLogin(role);
          if (response.success && response.data) {
            set({ 
              user: response.data.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: response.error || 'Demo login failed' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              set({ user: data.data, isAuthenticated: true, isLoading: false });
              return true;
            }
          }
          set({ user: null, isAuthenticated: false, isLoading: false });
          return false;
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return false;
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Initialize auth check on app load
if (typeof window !== 'undefined') {
  useAuth.getState().checkAuth();
}