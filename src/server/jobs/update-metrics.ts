// src/server/jobs/update-metrics.ts
import { prisma } from '@/lib/db/prisma';
import { startOfDay, subDays } from 'date-fns';

export async function updateDailyMetrics() {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  const tasksCreated = await prisma.task.count({
    where: { createdAt: { gte: yesterday, lt: today } },
  });

  const tasksCompleted = await prisma.task.count({
    where: { completedAt: { gte: yesterday, lt: today }, status: 'completed' },
  });

  const activeUsers = await prisma.activityLog.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: yesterday, lt: today } },
  });

  await prisma.metricSnapshot.create({
    data: {
      metricType: 'daily_activity',
      value: tasksCreated,
      metadata: { tasksCompleted, activeUsers: activeUsers.length, date: yesterday },
      timestamp: yesterday,
    },
  });

  return { tasksCreated, tasksCompleted, activeUsers: activeUsers.length };
}