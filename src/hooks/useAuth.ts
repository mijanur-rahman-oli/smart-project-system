// src/hooks/useAuth.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<boolean>;
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
          const formData = new FormData();
          formData.append('email', email);
          formData.append('password', password);
          formData.append('rememberMe', String(rememberMe));
          
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            body: formData,
          });
          
          if (response.redirected) {
            // Login successful, redirect happened
            set({ isLoading: false });
            return { success: true };
          }
          
          const data = await response.json();
          if (data.success) {
            set({ 
              user: data.data.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: data.error || 'Login failed' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      register: async (name, email, password, confirmPassword) => {
        set({ isLoading: true });
        try {
          const formData = new FormData();
          formData.append('name', name);
          formData.append('email', email);
          formData.append('password', password);
          formData.append('confirmPassword', confirmPassword);
          
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          if (data.success) {
            set({ isLoading: false });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, error: data.error || 'Registration failed' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
          set({ user: null, isAuthenticated: false, isLoading: false });
          window.location.href = '/login';
        } catch (error) {
          set({ isLoading: false });
        }
      },

      demoLogin: async (role) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
          });
          
          if (response.redirected) {
            set({ isLoading: false });
            return { success: true };
          }
          
          set({ isLoading: false });
          return { success: false, error: 'Demo login failed' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);