// src/app/api/tasks/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { sendTaskNotification } from '@/server/services/notification.service';

const assignTaskSchema = z.object({
  assignedTo: z.string().cuid().nullable(),
});

const idParamSchema = z.object({
  id: z.string().cuid('Invalid task ID'),
});

// PATCH /api/tasks/:id/assign - Assign/unassign task
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
    const { assignedTo } = assignTaskSchema.parse(body);

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

    // Check if task is completed
    if (task.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Completed tasks cannot be reassigned' },
        { status: 403 }
      );
    }

    // Check permissions (only admins and project managers can assign)
    const isAdmin = user.role === 'admin';
    const isProjectManager = user.role === 'project_manager';
    const isProjectCreator = task.project.createdBy === user.id;

    if (!isAdmin && !isProjectManager && !isProjectCreator) {
      return NextResponse.json(
        { success: false, error: 'Only admins and project managers can assign tasks' },
        { status: 403 }
      );
    }

    const oldAssigneeId = task.assignedTo;
    let newAssigneeName = null;

    if (assignedTo) {
      const newAssignee = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { name: true, email: true },
      });
      newAssigneeName = newAssignee?.name;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        assignedTo,
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
      action: 'TASK_ASSIGNED',
      entityType: 'task',
      entityId: id,
      metadata: {
        taskTitle: task.title,
        previousAssignee: task.assignee?.name,
        newAssignee: newAssigneeName,
      },
    });

    // Send notification to new assignee
    if (assignedTo && assignedTo !== oldAssigneeId) {
      await sendTaskNotification({
        taskId: id,
        type: 'TASK_ASSIGNED',
        recipients: [assignedTo],
        metadata: {
          taskTitle: task.title,
          projectName: task.project.name,
          assignedBy: user.name,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: assignedTo ? 'Task assigned successfully' : 'Task unassigned successfully',
    });
  } catch (error) {
    console.error('PATCH /api/tasks/:id/assign error:', error);
    
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