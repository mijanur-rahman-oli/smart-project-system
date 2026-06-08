// src/types/notification.types.ts
export type NotificationType = 
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'COMMENT_MENTIONED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'SYSTEM_ALERT';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata: Record<string, any>;
  isRead: boolean;
  isArchived: boolean;
  priority: NotificationPriority;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationPreference {
  type: NotificationType;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}