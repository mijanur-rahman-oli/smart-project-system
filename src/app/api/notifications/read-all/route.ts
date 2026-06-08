// src/app/api/notifications/read-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

// POST /api/notifications/read-all - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
        isArchived: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'ALL_NOTIFICATIONS_READ',
      entityType: 'notification',
      entityId: 'all',
      metadata: {
        updatedCount: result.count,
      },
    });

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.count },
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('POST /api/notifications/read-all error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}