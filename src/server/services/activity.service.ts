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
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');

    // Don't log if entityId is empty or invalid
    if (!params.entityId || params.entityId === '') {
      console.log('Skipping activity log - no entityId provided');
      return;
    }

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
    // Don't throw - activity logging shouldn't break the main flow
    console.error('Failed to log activity:', error);
  }
}