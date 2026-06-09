// src/server/actions/notification.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';

export async function getUserNotifications(options: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const where: any = { userId: user.id, isArchived: false };
    if (options.unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, isRead: false, isArchived: false } }),
    ]);

    return {
      success: true,
      data: notifications,
      pagination: { total, unreadCount },
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch notifications' };
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const user = await requireAuth();

    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark as read' };
  }
}

export async function markAllAsRead() {
  try {
    const user = await requireAuth();

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark all as read' };
  }
}

export async function archiveNotification(notificationId: string) {
  try {
    const user = await requireAuth();

    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { isArchived: true },
    });

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to archive notification' };
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const user = await requireAuth();

    await prisma.notification.deleteMany({
      where: { id: notificationId, userId: user.id },
    });

    revalidatePath('/dashboard/notifications');
    return { success: true, message: 'Notification deleted' };
  } catch (error) {
    return { success: false, error: 'Failed to delete notification' };
  }
}

export async function getNotificationPreferences() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
    });

    const allTypes = [
      'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED',
      'COMMENT_ADDED', 'COMMENT_MENTIONED', 'PROJECT_CREATED',
      'PROJECT_UPDATED', 'MEMBER_ADDED', 'TASK_DUE_SOON',
    ];

    const prefMap = new Map(preferences.map(p => [p.type, p]));
    const completePreferences = allTypes.map(type => ({
      type,
      emailEnabled: prefMap.get(type)?.emailEnabled ?? true,
      inAppEnabled: prefMap.get(type)?.inAppEnabled ?? true,
    }));

    return { success: true, data: completePreferences };
  } catch (error) {
    return { success: false, error: 'Failed to fetch preferences' };
  }
}

export async function updateNotificationPreferences(preferences: any[]) {
  try {
    const user = await requireAuth();

    for (const pref of preferences) {
      await prisma.notificationPreference.upsert({
        where: { userId_type: { userId: user.id, type: pref.type } },
        update: { emailEnabled: pref.emailEnabled, inAppEnabled: pref.inAppEnabled },
        create: { userId: user.id, type: pref.type, emailEnabled: pref.emailEnabled, inAppEnabled: pref.inAppEnabled },
      });
    }

    return { success: true, message: 'Preferences updated' };
  } catch (error) {
    return { success: false, error: 'Failed to update preferences' };
  }
}

export async function getUnreadCount() {
  try {
    const user = await getCurrentUser();
    if (!user) return 0;

    const count = await prisma.notification.count({
      where: { userId: user.id, isRead: false, isArchived: false },
    });

    return count;
  } catch (error) {
    return 0;
  }
}