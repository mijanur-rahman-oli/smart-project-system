// src/app/api/analytics/realtime/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { startOfDay, subDays } from 'date-fns';

// GET /api/analytics/realtime - Get real-time metrics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);

    // Build access filters
    let projectFilter = {};
    
    if (user.role !== 'admin') {
      const accessibleProjects = await prisma.project.findMany({
        where: {
          OR: [
            { createdBy: user.id },
            { members: { some: { userId: user.id } } }
          ]
        },
        select: { id: true }
      });
      
      const projectIds = accessibleProjects.map(p => p.id);
      projectFilter = { projectId: { in: projectIds } };
    }

    const [
      tasksCreatedToday,
      tasksCreatedYesterday,
      tasksCompletedToday,
      tasksCompletedYesterday,
      activeUsersToday,
      activeUsersYesterday,
    ] = await Promise.all([
      prisma.task.count({
        where: {
          ...projectFilter,
          createdAt: { gte: today },
        },
      }),
      prisma.task.count({
        where: {
          ...projectFilter,
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.task.count({
        where: {
          ...projectFilter,
          completedAt: { gte: today },
          status: 'completed',
        },
      }),
      prisma.task.count({
        where: {
          ...projectFilter,
          completedAt: { gte: yesterday, lt: today },
          status: 'completed',
        },
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: today },
        },
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: yesterday, lt: today },
        },
      }),
    ]);

    const tasksCreatedTrend = tasksCreatedYesterday === 0 
      ? 100 
      : ((tasksCreatedToday - tasksCreatedYesterday) / tasksCreatedYesterday) * 100;

    const tasksCompletedTrend = tasksCompletedYesterday === 0 
      ? 100 
      : ((tasksCompletedToday - tasksCompletedYesterday) / tasksCompletedYesterday) * 100;

    const activeUsersTrend = activeUsersYesterday.length === 0 
      ? 100 
      : ((activeUsersToday.length - activeUsersYesterday.length) / activeUsersYesterday.length) * 100;

    return NextResponse.json({
      success: true,
      data: {
        tasksCreatedToday,
        tasksCreatedTrend: Math.round(tasksCreatedTrend),
        tasksCompletedToday,
        tasksCompletedTrend: Math.round(tasksCompletedTrend),
        activeUsersToday: activeUsersToday.length,
        activeUsersTrend: Math.round(activeUsersTrend),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/realtime error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}