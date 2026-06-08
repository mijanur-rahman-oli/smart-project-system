// src/server/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema } from '@/lib/validations/task.schema';
import { getCurrentUser, requireAuth, checkProjectAccess } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { sendTaskNotification } from '@/server/services/notification.service';
import { z } from 'zod';

export async function createTaskAction(formData: FormData) {
  try {
    const user = await requireAuth();

    const validatedData = createTaskSchema.parse({
      projectId: formData.get('projectId'),
      title: formData.get('title'),
      description: formData.get('description') || null,
      assignedTo: formData.get('assignedTo') || null,
      dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string) : null,
      priority: formData.get('priority') || 'medium',
    });

    const hasAccess = await checkProjectAccess(validatedData.projectId, user.id);
    if (!hasAccess && user.role !== 'admin') {
      return { success: false, error: 'You do not have access to this project' };
    }

    const existingTask = await prisma.task.findFirst({
      where: { projectId: validatedData.projectId, title: validatedData.title },
    });

    if (existingTask) {
      return { success: false, error: 'A task with this title already exists in this project' };
    }

    const task = await prisma.task.create({
      data: {
        projectId: validatedData.projectId,
        title: validatedData.title,
        description: validatedData.description,
        assignedTo: validatedData.assignedTo,
        createdBy: user.id,
        dueDate: validatedData.dueDate,
        priority: validatedData.priority,
      },
      include: { assignee: true, project: true },
    });

    await logActivity({
      userId: user.id,
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: task.id,
      metadata: { taskTitle: task.title, projectId: task.projectId },
    });

    if (task.assignedTo) {
      await sendTaskNotification(task.id, 'TASK_ASSIGNED', {
        assignedBy: user.name,
        taskTitle: task.title,
        projectName: task.project.name,
      });
    }

    revalidatePath(`/dashboard/projects/${validatedData.projectId}`);
    return { success: true, data: task, message: 'Task created successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to create task' };
  }
}

export async function updateTaskStatusAction(taskId: string, newStatus: string) {
  try {
    const user = await requireAuth();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true, assignee: true },
    });

    if (!task) return { success: false, error: 'Task not found' };

    const hasAccess = task.project.createdBy === user.id ||
      task.assignee?.id === user.id ||
      user.role === 'admin';

    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to update this task' };
    }

    const oldStatus = task.status;
    const validatedData = updateTaskStatusSchema.parse({ id: taskId, status: newStatus });

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: validatedData.status,
        completedAt: validatedData.status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'TASK_STATUS_UPDATED',
      entityType: 'task',
      entityId: taskId,
      metadata: { taskTitle: task.title, oldStatus, newStatus: validatedData.status },
    });

    revalidatePath(`/dashboard/projects/${task.projectId}`);
    return { success: true, data: updatedTask, message: `Task marked as ${newStatus.replace('_', ' ')}` };
  } catch (error) {
    return { success: false, error: 'Failed to update task status' };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const user = await requireAuth();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) return { success: false, error: 'Task not found' };

    const isAuthorized = user.role === 'admin' ||
      task.project.createdBy === user.id ||
      task.createdBy === user.id;

    if (!isAuthorized) {
      return { success: false, error: 'You do not have permission to delete this task' };
    }

    await logActivity({
      userId: user.id,
      action: 'TASK_DELETED',
      entityType: 'task',
      entityId: taskId,
      metadata: { taskTitle: task.title, projectId: task.projectId },
    });

    await prisma.task.delete({ where: { id: taskId } });

    revalidatePath(`/dashboard/projects/${task.projectId}`);
    return { success: true, message: 'Task deleted successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to delete task' };
  }
}