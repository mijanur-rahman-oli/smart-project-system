// src/app/api/activity-logs/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { format } from 'date-fns';

const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
});

// GET /api/activity-logs/export - Export activity logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can export logs
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const { format, startDate, endDate, action, entityType } = exportSchema.parse({
      format: searchParams.get('format'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      action: searchParams.get('action'),
      entityType: searchParams.get('entityType'),
    });

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Max 10k logs per export
    });

    if (format === 'json') {
      const jsonData = JSON.stringify(logs, null, 2);
      return new NextResponse(jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="activity-logs-${format(new Date(), 'yyyy-MM-dd')}.json"`,
        },
      });
    }

    // Format as CSV
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Metadata', 'IP Address'];
    const csvRows = [headers];

    for (const log of logs) {
      csvRows.push([
        format(log.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        log.user?.name || 'System',
        log.user?.email || '',
        log.action,
        log.entityType,
        log.entityId,
        JSON.stringify(log.metadata || {}),
        log.ipAddress || '',
      ]);
    }

    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/activity-logs/export error:', error);
    
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