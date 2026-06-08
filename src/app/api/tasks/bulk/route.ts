// src/app/api/tasks/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const bulkStatusUpdateSchema = z.object({
  taskIds: z.array(z.string().cuid()),
  status: z.enum(['todo', 'in_progress', 'completed']),
});

// PATCH /api/tasks/bulk - Bulk update tasks
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskIds, status } = bulkStatusUpdateSchema.parse(body);

    // Get tasks with their projects
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
      },
      include: {
        project: true,
        assignee: true,
      },
    });

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some tasks not found' },
        { status: 404 }
      );
    }

    // Check permissions for each task
    for (const task of tasks) {
      const hasAccess = task.project.createdBy === user.id ||
        task.assignee?.id === user.id ||
        user.role === 'admin';

      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: `Insufficient permissions for task: ${task.title}` },
          { status: 403 }
        );
      }

      // Check if task is completed
      if (task.status === 'completed' && status !== 'completed' && user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: `Cannot modify completed task: ${task.title}` },
          { status: 403 }
        );
      }
    }

    // Bulk update
    const updatedTasks = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
      },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'BULK_TASK_STATUS_UPDATE',
      entityType: 'task',
      entityId: 'bulk',
      metadata: {
        taskIds,
        newStatus: status,
        count: updatedTasks.count,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTasks,
      message: `${updatedTasks.count} tasks updated successfully`,
    });
  } catch (error) {
    console.error('PATCH /api/tasks/bulk error:', error);
    
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