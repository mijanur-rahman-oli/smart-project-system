// src/app/api/activity-logs/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { subDays, format } from 'date-fns';

const summarySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

// GET /api/activity-logs/summary - Get activity summary
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const { days } = summarySchema.parse({
      days: searchParams.get('days'),
    });

    const startDate = subDays(new Date(), days);
    
    const where: any = {
      createdAt: { gte: startDate },
    };

    if (user.role !== 'admin') {
      where.userId = user.id;
    }

    // Get total activities
    const totalActivities = await prisma.activityLog.count({ where });

    // Get unique users
    const uniqueUsers = await prisma.activityLog.groupBy({
      by: ['userId'],
      where,
    });

    // Get action distribution
    const actionDistribution = await prisma.activityLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 10,
    });

    // Get timeline data
    const timeline = await prisma.activityLog.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group timeline by day
    const timelineByDay = timeline.reduce((acc, log) => {
      const date = format(log.createdAt, 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timelineData = Object.entries(timelineByDay).map(([date, count]) => ({
      date,
      count,
    }));

    // Get entity type distribution
    const entityDistribution = await prisma.activityLog.groupBy({
      by: ['entityType'],
      where,
      _count: {
        entityType: true,
      },
    });

    // Get recent logs
    const recentLogs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalActivities,
        uniqueUsers: uniqueUsers.length,
        actionDistribution: actionDistribution.map(a => ({
          action: a.action,
          count: a._count.action,
        })),
        timeline: timelineData,
        entityDistribution: entityDistribution.map(e => ({
          entityType: e.entityType,
          count: e._count.entityType,
        })),
        recentLogs,
        period: {
          start: startDate,
          end: new Date(),
          days,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/activity-logs/summary error:', error);
    
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