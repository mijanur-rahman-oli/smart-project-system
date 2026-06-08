// src/app/api/activity-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().cuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'action']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/activity-logs - Get activity logs
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
      userId: searchParams.get('userId'),
      action: searchParams.get('action'),
      entityType: searchParams.get('entityType'),
      entityId: searchParams.get('entityId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    // Build where clause
    const where: any = {};

    if (query.userId) {
      // Non-admins can only see their own logs
      if (user.role !== 'admin' && query.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
      where.userId = query.userId;
    } else if (user.role !== 'admin') {
      where.userId = user.id;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { metadata: { path: ['taskTitle'], string_contains: query.search } },
        { metadata: { path: ['projectName'], string_contains: query.search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
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
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Enrich logs with entity names
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        let entityName = '';
        
        if (log.entityType === 'project') {
          const project = await prisma.project.findUnique({
            where: { id: log.entityId },
            select: { name: true },
          });
          entityName = project?.name || '';
        } else if (log.entityType === 'task') {
          const task = await prisma.task.findUnique({
            where: { id: log.entityId },
            select: { title: true },
          });
          entityName = task?.title || '';
        } else if (log.entityType === 'user') {
          const user = await prisma.user.findUnique({
            where: { id: log.entityId },
            select: { name: true },
          });
          entityName = user?.name || '';
        }
        
        return { ...log, entityName };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error('GET /api/activity-logs error:', error);
    
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