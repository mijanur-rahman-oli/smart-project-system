// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assignedTo: z.string().cuid().nullable().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
});

const idParamSchema = z.object({
  id: z.string().cuid('Invalid task ID'),
});

// GET /api/tasks/:id - Get task by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = idParamSchema.parse(params);

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true, status: true, createdBy: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check access
    const hasAccess = task.project.createdBy === user.id ||
      task.assignee?.id === user.id ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('GET /api/tasks/:id error:', error);
    
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

// PUT /api/tasks/:id - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = idParamSchema.parse(params);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const hasProjectAccess = existingTask.project.createdBy === user.id ||
      existingTask.assignee?.id === user.id ||
      user.role === 'admin';

    if (!hasProjectAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if task is completed
    if (existingTask.status === 'completed' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Completed tasks cannot be modified' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // Check for duplicate title if title is being changed
    if (validatedData.title && validatedData.title !== existingTask.title) {
      const duplicateTask = await prisma.task.findFirst({
        where: {
          projectId: existingTask.projectId,
          title: validatedData.title,
          id: { not: id },
        },
      });

      if (duplicateTask) {
        return NextResponse.json(
          { success: false, error: 'A task with this title already exists in this project' },
          { status: 409 }
        );
      }
    }

    // Check if reassigning a completed task
    if (existingTask.status === 'completed' && validatedData.assignedTo && validatedData.assignedTo !== existingTask.assignedTo) {
      return NextResponse.json(
        { success: false, error: 'Completed tasks cannot be reassigned' },
        { status: 403 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
        updatedAt: new Date(),
        completedAt: validatedData.status === 'completed' && !existingTask.completedAt ? new Date() : undefined,
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
      action: 'TASK_UPDATED',
      entityType: 'task',
      entityId: id,
      metadata: {
        changes: validatedData,
        taskTitle: existingTask.title,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/tasks/:id error:', error);
    
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

// DELETE /api/tasks/:id - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = idParamSchema.parse(params);

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true,
        comments: true,
        attachments: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.role === 'admin';
    const isCreator = task.createdBy === user.id;
    const isProjectCreator = task.project.createdBy === user.id;

    if (!isAdmin && !isCreator && !isProjectCreator) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await logActivity({
      userId: user.id,
      action: 'TASK_DELETED',
      entityType: 'task',
      entityId: id,
      metadata: {
        taskTitle: task.title,
        projectId: task.projectId,
        commentCount: task.comments.length,
        attachmentCount: task.attachments.length,
      },
    });

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/tasks/:id error:', error);
    
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