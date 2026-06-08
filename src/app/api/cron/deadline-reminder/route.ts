// src/app/api/cron/deadline-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { sendTaskNotification } from '@/server/services/notification.service';

const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';

// POST /api/cron/deadline-reminders - Send deadline reminders
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tomorrow = startOfDay(addDays(new Date(), 1));
    const dayAfterTomorrow = endOfDay(addDays(new Date(), 1));
    
    // Find tasks due tomorrow that are not completed
    const tasksDueTomorrow = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
        status: { not: 'completed' },
      },
      include: {
        assignee: true,
        project: true,
        creator: true,
      },
    });
    
    const remindersSent = [];
    
    for (const task of tasksDueTomorrow) {
      if (task.assignee) {
        await sendTaskNotification({
          taskId: task.id,
          type: 'TASK_DUE_SOON',
          recipients: [task.assignee.id],
          metadata: {
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: task.dueDate,
            daysRemaining: 1,
          },
        });
        remindersSent.push({ taskId: task.id, assignee: task.assignee.email });
      }
      
      // Also notify creator if different from assignee
      if (task.creator.id !== task.assignee?.id) {
        await sendTaskNotification({
          taskId: task.id,
          type: 'TASK_DUE_SOON',
          recipients: [task.creator.id],
          metadata: {
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: task.dueDate,
            daysRemaining: 1,
          },
        });
      }
    }
    
    // Find overdue tasks and send notifications
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { not: 'completed' },
        updatedAt: { lt: subDays(new Date(), 1) }, // Only notify once per day
      },
      include: {
        assignee: true,
        project: true,
        creator: true,
      },
    });
    
    const overdueNotifications = [];
    
    for (const task of overdueTasks) {
      if (task.assignee) {
        await sendTaskNotification({
          taskId: task.id,
          type: 'TASK_OVERDUE',
          recipients: [task.assignee.id],
          metadata: {
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: task.dueDate,
          },
        });
        overdueNotifications.push({ taskId: task.id, assignee: task.assignee.email });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        remindersSent: remindersSent.length,
        overdueNotifications: overdueNotifications.length,
        timestamp: new Date().toISOString(),
      },
      message: `Sent ${remindersSent.length} deadline reminders and ${overdueNotifications.length} overdue notifications`,
    });
  } catch (error) {
    console.error('Cron deadline reminders error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { subDays } from 'date-fns';