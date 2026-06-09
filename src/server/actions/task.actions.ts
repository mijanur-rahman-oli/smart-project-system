// src/server/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth, checkProjectAccess } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { z } from 'zod';

const createTaskSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional().nullable(),
  assignedTo: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

const updateTaskSchema = createTaskSchema.partial();

// GET a single task by ID
export async function getTaskAction(taskId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, status: true, createdBy: true } },
        comments: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: { uploader: { select: { id: true, name: true } } },
        },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Check access
    const hasAccess = task.project.createdBy === user.id ||
      task.assignee?.id === user.id ||
      user.role === 'admin';

    if (!hasAccess) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('Get task error:', error);
    return { success: false, error: 'Failed to fetch task' };
  }
}

// GET tasks with filters
export async function getTasksAction(filters: {
  projectId?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get accessible project IDs
    let accessibleProjectIds: string[] = [];
    if (user.role === 'admin') {
      const projects = await prisma.project.findMany({ select: { id: true } });
      accessibleProjectIds = projects.map(p => p.id);
    } else {
      const userProjects = await prisma.projectMember.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      });
      accessibleProjectIds = userProjects.map(p => p.projectId);
      const createdProjects = await prisma.project.findMany({
        where: { createdBy: user.id },
        select: { id: true },
      });
      accessibleProjectIds.push(...createdProjects.map(p => p.id));
      accessibleProjectIds = [...new Set(accessibleProjectIds)];
    }

    const where: any = { projectId: { in: accessibleProjectIds } };
    
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.priority && filters.priority !== 'all') where.priority = filters.priority;
    
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { 
      success: true, 
      data: { tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } 
    };
  } catch (error) {
    console.error('Get tasks error:', error);
    return { success: false, error: 'Failed to fetch tasks' };
  }
}

// CREATE a new task
export async function createTaskAction(formData: FormData) {
  try {
    const user = await requireAuth();

    const validated = createTaskSchema.parse({
      projectId: formData.get('projectId'),
      title: formData.get('title'),
      description: formData.get('description') || null,
      assignedTo: formData.get('assignedTo') || null,
      dueDate: formData.get('dueDate'),
      priority: formData.get('priority') || 'medium',
    });

    const hasAccess = await checkProjectAccess(validated.projectId, user.id);
    if (!hasAccess && user.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const existingTask = await prisma.task.findFirst({
      where: { projectId: validated.projectId, title: validated.title },
    });

    if (existingTask) {
      return { success: false, error: 'A task with this title already exists in this project' };
    }

    const task = await prisma.task.create({
      data: {
        projectId: validated.projectId,
        title: validated.title,
        description: validated.description,
        assignedTo: validated.assignedTo,
        createdBy: user.id,
        dueDate: new Date(validated.dueDate),
        priority: validated.priority,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: task.id,
      metadata: { taskTitle: task.title },
    });

    revalidatePath(`/dashboard/projects/${validated.projectId}`);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: task, message: 'Task created successfully' };
  } catch (error) {
    console.error('Create task error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to create task' };
  }
}

// UPDATE task status
export async function updateTaskStatusAction(taskId: string, newStatus: string) {
  try {
    const user = await requireAuth();

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Task not found' };

    const hasAccess = await checkProjectAccess(task.projectId, user.id);
    if (!hasAccess && user.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const oldStatus = task.status;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus as any,
        completedAt: newStatus === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'TASK_STATUS_UPDATED',
      entityType: 'task',
      entityId: taskId,
      metadata: { taskTitle: task.title, oldStatus, newStatus },
    });

    revalidatePath(`/dashboard/projects/${task.projectId}`);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: updatedTask, message: `Task status updated to ${newStatus}` };
  } catch (error) {
    return { success: false, error: 'Failed to update task status' };
  }
}

// DELETE a task
export async function deleteTaskAction(taskId: string) {
  try {
    const user = await requireAuth();

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Task not found' };

    const hasAccess = await checkProjectAccess(task.projectId, user.id);
    if (!hasAccess && user.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    await logActivity({
      userId: user.id,
      action: 'TASK_DELETED',
      entityType: 'task',
      entityId: taskId,
      metadata: { taskTitle: task.title },
    });

    await prisma.task.delete({ where: { id: taskId } });

    revalidatePath(`/dashboard/projects/${task.projectId}`);
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Task deleted successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to delete task' };
  }
}

// UPDATE a task
export async function updateTaskAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const taskId = formData.get('id') as string;

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) return { success: false, error: 'Task not found' };

    const hasAccess = await checkProjectAccess(existingTask.projectId, user.id);
    if (!hasAccess && user.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const validated = updateTaskSchema.parse({
      title: formData.get('title') || undefined,
      description: formData.get('description') || null,
      assignedTo: formData.get('assignedTo') || undefined,
      dueDate: formData.get('dueDate') || undefined,
      priority: formData.get('priority') || undefined,
    });

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...validated,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'TASK_UPDATED',
      entityType: 'task',
      entityId: taskId,
      metadata: { taskTitle: task.title },
    });

    revalidatePath(`/dashboard/projects/${existingTask.projectId}`);
    revalidatePath('/dashboard/tasks');
    return { success: true, data: task, message: 'Task updated successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to update task' };
  }
}

// ASSIGN a task
export async function assignTaskAction(taskId: string, userId: string | null) {
  try {
    const user = await requireAuth();

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Task not found' };

    const hasAccess = await checkProjectAccess(task.projectId, user.id);
    if (!hasAccess && user.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { assignedTo: userId },
    });

    await logActivity({
      userId: user.id,
      action: 'TASK_ASSIGNED',
      entityType: 'task',
      entityId: taskId,
      metadata: { taskTitle: task.title, assignedTo: userId },
    });

    return { success: true, data: updatedTask, message: userId ? 'Task assigned' : 'Task unassigned' };
  } catch (error) {
    return { success: false, error: 'Failed to assign task' };
  }
}

// BULK update task status
export async function bulkUpdateTaskStatusAction(taskIds: string[], newStatus: string) {
  try {
    const user = await requireAuth();

    const updatedTasks = await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: {
        status: newStatus as any,
        completedAt: newStatus === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'BULK_TASK_STATUS_UPDATE',
      entityType: 'task',
      entityId: 'bulk',
      metadata: { taskIds, newStatus, count: updatedTasks.count },
    });

    revalidatePath('/dashboard/tasks');
    return { success: true, message: `${updatedTasks.count} tasks updated` };
  } catch (error) {
    return { success: false, error: 'Failed to update tasks' };
  }
}