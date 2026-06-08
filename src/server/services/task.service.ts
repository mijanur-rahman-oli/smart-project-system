// src/server/services/task.service.ts
import { prisma } from '@/lib/db/prisma';

export async function getTasksByUser(userId: string, filters?: {
  projectId?: string;
  status?: string;
  priority?: string;
  assignedToMe?: boolean;
}) {
  const where: any = {};

  if (filters?.projectId) where.projectId = filters.projectId;
  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.assignedToMe) where.assignedTo = userId;

  // Get accessible projects
  const accessibleProjects = await prisma.project.findMany({
    where: {
      OR: [
        { createdBy: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  where.projectId = { in: accessibleProjects.map(p => p.id) };

  return prisma.task.findMany({
    where,
    include: { assignee: true, project: true, _count: { select: { comments: true, attachments: true } } },
    orderBy: { dueDate: 'asc' },
  });
}

export async function getTaskWithDetails(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      },
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, status: true, createdBy: true } },
      comments: { include: { user: true, attachments: true }, orderBy: { createdAt: 'asc' } },
      attachments: { include: { uploader: true } },
      _count: { select: { comments: true, attachments: true } },
    },
  });

  return task;
}

export async function getUserTaskStats(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { assignedTo: userId },
    select: { status: true, priority: true, dueDate: true },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const byPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  return { totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks, completionRate, byPriority };
}