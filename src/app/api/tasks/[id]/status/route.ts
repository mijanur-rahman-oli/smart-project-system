// src/app/api/tasks/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { sendTaskNotification } from '@/server/services/notification.service';

const statusUpdateSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed']),
});

const idParamSchema = z.object({
  id: z.string().cuid('Invalid task ID'),
});

// PATCH /api/tasks/:id/status - Update task status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = idParamSchema.parse(params);
    const body = await request.json();
    const { status } = statusUpdateSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const hasAccess = task.project.createdBy === user.id ||
      task.assignee?.id === user.id ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const oldStatus = task.status;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await logActivity({
      userId: user.id,
      action: 'TASK_STATUS_UPDATED',
      entityType: 'task',
      entityId: id,
      metadata: {
        taskTitle: task.title,
        oldStatus,
        newStatus: status,
      },
    });

    // Send notification
    await sendTaskNotification({
      taskId: id,
      type: 'TASK_STATUS_CHANGED',
      recipients: [task.createdBy, task.assignedTo].filter(Boolean),
      metadata: {
        taskTitle: task.title,
        projectName: task.project.name,
        changedBy: user.name,
        oldStatus,
        newStatus: status,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: `Task status updated to ${status.replace('_', ' ')}`,
    });
  } catch (error) {
    console.error('PATCH /api/tasks/:id/status error:', error);
    
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