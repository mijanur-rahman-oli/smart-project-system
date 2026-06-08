// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
  type: z.string().optional(),
  sortBy: z.enum(['createdAt', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      unreadOnly: searchParams.get('unreadOnly'),
      type: searchParams.get('type'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    const where: any = {
      userId: user.id,
      isArchived: false,
    };

    if (query.unreadOnly) {
      where.isRead = false;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
          isArchived: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        unreadCount,
      },
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete all read notifications
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    const result = await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        isRead: true,
        isArchived: false,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'NOTIFICATIONS_CLEARED',
      entityType: 'notification',
      entityId: 'bulk',
      metadata: {
        deletedCount: result.count,
      },
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
      message: `${result.count} notifications cleared`,
    });
  } catch (error) {
    console.error('DELETE /api/notifications error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}