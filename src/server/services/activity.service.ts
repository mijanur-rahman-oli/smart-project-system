// src/server/services/activity.service.ts
import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';

interface LogActivityParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    // Await headers() in Next.js 16
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');

    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues || {},
        newValues: params.newValues || {},
        metadata: params.metadata || {},
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function getActivityLogs(filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 50, 100);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
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

  return {
    success: true,
    data: logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}