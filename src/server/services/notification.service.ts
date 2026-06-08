// src/server/services/notification.service.ts
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from './email.service';

export async function sendTaskNotification(taskId: string, type: string, metadata: any) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: { include: { user: true } } } }, assignee: true },
    });

    if (!task) return;

    let recipients: string[] = [];
    if (type === 'TASK_ASSIGNED' && task.assignee) {
      recipients = [task.assignee.id];
    } else {
      recipients = task.project.members.map(m => m.userId);
    }

    const notifications = recipients.map(userId => ({
      userId,
      type,
      title: getNotificationTitle(type),
      content: getNotificationContent(type, metadata, task),
      metadata: { taskId, ...metadata },
    }));

    await prisma.notification.createMany({ data: notifications });

    // Send emails for high-priority notifications
    if (type === 'TASK_ASSIGNED') {
      for (const userId of recipients) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          await sendEmail({
            to: user.email,
            subject: `Task Assigned: ${task.title}`,
            html: `<h2>New Task Assigned</h2><p>You have been assigned to "${task.title}" in ${task.project.name}.</p>`,
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to send notifications:', error);
  }
}

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    TASK_ASSIGNED: 'New Task Assigned',
    TASK_STATUS_CHANGED: 'Task Status Updated',
    COMMENT_ADDED: 'New Comment',
    TASK_DUE_SOON: 'Deadline Approaching',
  };
  return titles[type] || 'Notification';
}

function getNotificationContent(type: string, metadata: any, task: any): string {
  switch (type) {
    case 'TASK_ASSIGNED':
      return `${metadata.assignedBy} assigned "${task.title}" to you`;
    case 'TASK_STATUS_CHANGED':
      return `Task "${task.title}" status changed to ${metadata.newStatus}`;
    case 'COMMENT_ADDED':
      return `${metadata.commenterName} commented on "${task.title}"`;
    default:
      return `Update on "${task.title}"`;
  }
}