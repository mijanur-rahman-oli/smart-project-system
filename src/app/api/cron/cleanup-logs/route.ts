// src/app/api/cron/cleanup-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { subDays } from 'date-fns';

// This endpoint should be protected by a secret in production
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';

// DELETE /api/cron/cleanup-logs - Clean up old activity logs
export async function DELETE(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get retention settings
    const retention = await prisma.activityLogRetention.findFirst();
    const retentionDays = retention?.retentionDays || 90;
    
    const cutoffDate = subDays(new Date(), retentionDays);
    
    // Delete old logs
    const deleted = await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    
    // Update last cleanup timestamp
    await prisma.activityLogRetention.upsert({
      where: { id: 'default' },
      update: {
        lastCleanup: new Date(),
      },
      create: {
        id: 'default',
        retentionDays,
        lastCleanup: new Date(),
      },
    });
    
    // Also clean up old notifications
    const notificationCutoff = subDays(new Date(), 30); // Keep 30 days of notifications
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: notificationCutoff },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        activityLogsDeleted: deleted.count,
        notificationsDeleted: deletedNotifications.count,
        retentionDays,
      },
      message: `Cleaned up logs older than ${retentionDays} days`,
    });
  } catch (error) {
    console.error('Cron cleanup logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}