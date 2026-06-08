// src/server/jobs/cleanup-logs.ts
import { prisma } from '@/lib/db/prisma';
import { subDays } from 'date-fns';

export async function cleanupOldLogs() {
  const retentionDays = 90;
  const cutoffDate = subDays(new Date(), retentionDays);

  const deleted = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });

  const deletedNotifications = await prisma.notification.deleteMany({
    where: { isRead: true, createdAt: { lt: subDays(new Date(), 30) } },
  });

  console.log(`Cleaned up ${deleted.count} logs and ${deletedNotifications.count} notifications`);
  return { logsDeleted: deleted.count, notificationsDeleted: deletedNotifications.count };
}