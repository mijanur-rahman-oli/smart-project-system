// src/server/actions/activity.actions.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { format } from 'date-fns';

interface ActivityFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
  projectId?: string;
}

export async function getActivityLogs(filters: ActivityFilters = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.projectId) {
      where.entityType = 'project';
      where.entityId = filters.projectId;
    } else if (filters.userId) {
      if (user.role !== 'admin' && filters.userId !== user.id) {
        return { success: false, error: 'Access denied' };
      }
      where.userId = filters.userId;
    } else if (user.role !== 'admin') {
      where.userId = user.id;
    }

    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
        { metadata: { path: ['taskTitle'], string_contains: filters.search } },
        { metadata: { path: ['projectName'], string_contains: filters.search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Enrich logs with entity names
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        let entityName = '';
        if (log.entityType === 'project') {
          const project = await prisma.project.findUnique({ where: { id: log.entityId }, select: { name: true } });
          entityName = project?.name || '';
        } else if (log.entityType === 'task') {
          const task = await prisma.task.findUnique({ where: { id: log.entityId }, select: { title: true } });
          entityName = task?.title || '';
        } else if (log.entityType === 'user') {
          const user = await prisma.user.findUnique({ where: { id: log.entityId }, select: { name: true } });
          entityName = user?.name || '';
        }
        return { ...log, entityName };
      })
    );

    return {
      success: true,
      data: enrichedLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    console.error('Get activity logs error:', error);
    return { success: false, error: 'Failed to fetch activity logs' };
  }
}

export async function exportActivityLogs(filters: {
  startDate?: Date;
  endDate?: Date;
  action?: string;
  entityType?: string;
  projectId?: string;
  format?: 'csv' | 'json';
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (user.role !== 'admin') {
      return { success: false, error: 'Only admins can export logs' };
    }

    const where: any = {};

    if (filters.projectId) {
      where.entityType = 'project';
      where.entityId = filters.projectId;
    }

    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const formatType = filters.format || 'csv';

    if (formatType === 'json') {
      const jsonData = JSON.stringify(logs, null, 2);
      return {
        success: true,
        data: jsonData,
        mimeType: 'application/json',
        filename: `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.json`,
      };
    }

    // CSV format
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Metadata', 'IP Address'];
    const rows = logs.map(log => [
      format(log.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      log.user?.name || 'System',
      log.user?.email || '',
      log.action,
      log.entityType,
      log.entityId,
      JSON.stringify(log.metadata || {}),
      log.ipAddress || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return {
      success: true,
      data: csvContent,
      mimeType: 'text/csv',
      filename: `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    };
  } catch (error) {
    console.error('Export activity logs error:', error);
    return { success: false, error: 'Failed to export logs' };
  }
}

export async function getActivitySummary(days: number = 30) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = { createdAt: { gte: startDate } };
    if (user.role !== 'admin') {
      where.userId = user.id;
    }

    const [totalActivities, uniqueUsers, actionDistribution, timeline, entityDistribution, recentLogs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.groupBy({ by: ['userId'], where }),
      prisma.activityLog.groupBy({ by: ['action'], where, _count: { action: true }, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      prisma.activityLog.findMany({ where, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
      prisma.activityLog.groupBy({ by: ['entityType'], where, _count: { entityType: true } }),
      prisma.activityLog.findMany({ where, include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    // Group timeline by day
    const timelineByDay = timeline.reduce((acc, log) => {
      const date = format(log.createdAt, 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timelineData = Object.entries(timelineByDay).map(([date, count]) => ({ date, count }));

    return {
      success: true,
      data: {
        totalActivities,
        uniqueUsers: uniqueUsers.length,
        actionDistribution: actionDistribution.map(a => ({ action: a.action, count: a._count.action })),
        timeline: timelineData,
        entityDistribution: entityDistribution.map(e => ({ entityType: e.entityType, count: e._count.entityType })),
        recentLogs,
        period: { start: startDate, end: new Date(), days },
      },
    };
  } catch (error) {
    console.error('Get activity summary error:', error);
    return { success: false, error: 'Failed to fetch activity summary' };
  }
}