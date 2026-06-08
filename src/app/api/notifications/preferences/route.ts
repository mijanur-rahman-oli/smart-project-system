// src/app/api/notifications/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';

const preferencesSchema = z.object({
  preferences: z.array(z.object({
    type: z.string(),
    emailEnabled: z.boolean(),
    inAppEnabled: z.boolean(),
  })),
});

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
    });

    // Get all possible notification types
    const allTypes = [
      'TASK_ASSIGNED',
      'TASK_UPDATED',
      'TASK_STATUS_CHANGED',
      'COMMENT_ADDED',
      'COMMENT_MENTIONED',
      'PROJECT_CREATED',
      'PROJECT_UPDATED',
      'MEMBER_ADDED',
      'MEMBER_REMOVED',
      'TASK_DUE_SOON',
      'TASK_OVERDUE',
      'SYSTEM_ALERT',
    ];

    const prefMap = new Map(preferences.map(p => [p.type, p]));

    const completePreferences = allTypes.map(type => ({
      type,
      emailEnabled: prefMap.get(type)?.emailEnabled ?? true,
      inAppEnabled: prefMap.get(type)?.inAppEnabled ?? true,
    }));

    return NextResponse.json({
      success: true,
      data: completePreferences,
    });
  } catch (error) {
    console.error('GET /api/notifications/preferences error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { preferences } = preferencesSchema.parse(body);

    // Upsert preferences
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
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          type: pref.type,
          emailEnabled: pref.emailEnabled,
          inAppEnabled: pref.inAppEnabled,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/notifications/preferences error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}