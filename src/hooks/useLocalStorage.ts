
// src/hooks/useLocalStorage.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Get stored value
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue]
  );

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        setStoredValue(JSON.parse(event.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

// Predefined storage hooks
export function useThemePreference() {
  return useLocalStorage<'light' | 'dark' | 'system'>('theme', 'system');
}

export function useSidebarState() {
  return useLocalStorage('sidebar-collapsed', false);
}

export function useRecentSearches() {
  return useLocalStorage<string[]>('recent-searches', []);
}

export function useDashboardWidgets() {
  return useLocalStorage('dashboard-widgets', [
    { id: 'kpi', title: 'KPI Cards', isVisible: true },
    { id: 'charts', title: 'Charts', isVisible: true },
    { id: 'realtime', title: 'Real-Time Metrics', isVisible: true },
    { id: 'upcoming', title: 'Upcoming Tasks', isVisible: true },
    { id: 'activity', title: 'Recent Activity', isVisible: true },
  ]);
}