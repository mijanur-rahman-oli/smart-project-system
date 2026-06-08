// src/hooks/useNotifications.ts
'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: any;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  fetchNotifications: (append?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  getUnreadCount: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchNotifications: async (append = false) => {
    const { isLoading, page, hasMore } = get();
    if (isLoading || (!append && !hasMore)) return;
    
    set({ isLoading: true });
    try {
      const response = await apiClient.getNotifications({ limit: 20, offset: append ? (page - 1) * 20 : 0 });
      if (response.success) {
        const newNotifications = response.data || [];
        set({
          notifications: append ? [...get().notifications, ...newNotifications] : newNotifications,
          page: append ? page + 1 : 2,
          hasMore: newNotifications.length === 20,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await apiClient.markNotificationAsRead(id);
      set({
        notifications: get().notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      set({
        notifications: get().notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0,
      });
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  },

  archiveNotification: async (id) => {
    try {
      // Assuming archive endpoint exists
      await apiClient.delete(`/notifications/${id}`);
      set({
        notifications: get().notifications.filter(n => n.id !== id),
      });
    } catch (error) {
      console.error('Failed to archive notification:', error);
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      if (response.success) {
        set({ unreadCount: response.data.count });
      }
    } catch (error) {
      console.error('Failed to get unread count:', error);
    }
  },

  addNotification: (notification) => {
    set({
      notifications: [notification, ...get().notifications],
      unreadCount: get().unreadCount + 1,
    });
  },
}));

// Helper hook for notification preferences
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/notifications/preferences');
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: any[]) => {
    try {
      const response = await apiClient.put('/notifications/preferences', { preferences: newPreferences });
      if (response.success) {
        setPreferences(newPreferences);
        toast.success('Preferences updated');
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Failed to update preferences');
      return false;
    }
  };

  return { preferences, isLoading, updatePreferences, refetch: fetchPreferences };
}

import { useState, useEffect } from 'react';