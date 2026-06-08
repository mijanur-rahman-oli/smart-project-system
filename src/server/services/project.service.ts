// src/server/services/project.service.ts
import { prisma } from '@/lib/db/prisma';
import { ProjectStatus } from '@prisma/client';

export async function getProjectsByUser(userId: string, filters?: { status?: ProjectStatus; search?: string }) {
  const where: any = {
    OR: [
      { createdBy: userId },
      { members: { some: { userId } } },
    ],
  };
  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.project.findMany({
    where,
    include: { creator: { select: { id: true, name: true } }, _count: { select: { tasks: true, members: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectWithDetails(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { createdBy: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } } },
      tasks: {
        include: { assignee: true, _count: { select: { comments: true, attachments: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { tasks: true, members: true } },
    },
  });

  return project;
}

export async function getProjectStats(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { status: true, priority: true, dueDate: true },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const tasksByPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  return { totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks, completionRate, tasksByPriority };
}