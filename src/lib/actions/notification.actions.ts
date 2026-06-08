// src/lib/actions/notification.actions.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function getUserNotifications(options: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const where: any = {
    userId: user.id,
    isArchived: false,
  };

  if (options.unreadOnly) {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || 50,
    skip: options.offset || 0,
  });

  return {
    success: true,
    data: notifications,
  };
}

export async function markAsRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function markAllAsRead() {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function archiveNotification(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
    },
    data: {
      isArchived: true,
    },
  });

  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function getUnreadCount() {
  const user = await getCurrentUser();
  if (!user) {
    return 0;
  }

  const count = await prisma.notification.count({
    where: {
      userId: user.id,
      isRead: false,
      isArchived: false,
    },
  });

  return count;
}

export async function getNotificationPreferences() {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const preferences = await prisma.notificationPreference.findMany({
    where: { userId: user.id },
  });

  return {
    success: true,
    data: preferences,
  };
}

export async function updateNotificationPreferences(preferences: any[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  for (const pref of preferences) {
    await prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type: pref.type,
        },
      },
      update: {
        emailEnabled: pref.emailEnabled,
        inAppEnabled: pref.inAppEnabled,
      },
      create: {
        userId: user.id,
        type: pref.type,
        emailEnabled: pref.emailEnabled,
        inAppEnabled: pref.inAppEnabled,
      },
    });
  }

  revalidatePath('/dashboard/notifications');
  return { success: true };
}