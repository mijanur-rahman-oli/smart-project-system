// src/server/services/notification.service.ts
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from './email.service';

export async function sendTaskNotification(taskId: string, type: string, metadata: any) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        project: { 
          include: { 
            members: { 
              include: { 
                user: true 
              } 
            } 
          } 
        }, 
        assignee: true 
      },
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
  } catch (error) {
    console.error('Failed to send task notifications:', error);
  }
}

export async function sendCommentNotification(commentId: string, taskId: string, commenterId: string, content: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        assignee: true,
        creator: true,
      },
    });

    if (!task) return;

    const recipients = [task.createdBy];
    if (task.assignee && task.assignee.id !== commenterId) {
      recipients.push(task.assignee.id);
    }

    const commentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;

    const notifications = [...new Set(recipients)].map(userId => ({
      userId,
      type: 'COMMENT_ADDED',
      title: 'New Comment',
      content: `${task.creator?.name || 'Someone'} commented on "${task.title}": ${commentPreview}`,
      metadata: {
        commentId,
        taskId,
        projectId: task.project.id,
        taskTitle: task.title,
        projectName: task.project.name,
        commenterId,
        commentPreview,
      },
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  } catch (error) {
    console.error('Failed to send comment notification:', error);
  }
}

export async function sendProjectNotification(projectId: string, type: string, metadata: any) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!project) return;

    const notifications = project.members.map(member => ({
      userId: member.userId,
      type,
      title: getNotificationTitle(type),
      content: getNotificationContent(type, metadata, project),
      metadata: { projectId, ...metadata },
    }));

    await prisma.notification.createMany({ data: notifications });
  } catch (error) {
    console.error('Failed to send project notification:', error);
  }
}

export async function sendTeamInvitation(invitation: {
  email: string;
  projectName: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
}) {
  try {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;
    
    await sendEmail({
      to: invitation.email,
      subject: `Invitation to join ${invitation.projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>You've been invited to join ${invitation.projectName}</h2>
          <p><strong>${invitation.inviterName}</strong> has invited you to join the project.</p>
          <a href="${inviteUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
          <p>This invitation expires on ${invitation.expiresAt.toLocaleDateString()}.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send team invitation:', error);
  }
}

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    TASK_ASSIGNED: 'New Task Assigned',
    TASK_STATUS_CHANGED: 'Task Status Updated',
    COMMENT_ADDED: 'New Comment',
    TASK_DUE_SOON: 'Deadline Approaching',
    PROJECT_UPDATED: 'Project Updated',
    MEMBER_ADDED: 'Member Added',
  };
  return titles[type] || 'Notification';
}

function getNotificationContent(type: string, metadata: any, entity: any): string {
  switch (type) {
    case 'TASK_ASSIGNED':
      return `${metadata.assignedBy} assigned "${metadata.taskTitle}" to you`;
    case 'TASK_STATUS_CHANGED':
      return `Task "${metadata.taskTitle}" status changed from ${metadata.oldStatus} to ${metadata.newStatus}`;
    case 'COMMENT_ADDED':
      return `${metadata.commenterName || 'Someone'} commented on "${metadata.taskTitle}"`;
    case 'TASK_DUE_SOON':
      return `Task "${metadata.taskTitle}" in ${metadata.projectName} is due in ${metadata.daysRemaining} days`;
    case 'PROJECT_UPDATED':
      return `Project "${entity.name}" has been updated`;
    case 'MEMBER_ADDED':
      return `You have been added to project "${entity.name}"`;
    default:
      return 'You have a new notification';
  }
}