// src/server/services/workload.service.ts
import { prisma } from '@/lib/db/prisma';

export async function getMemberWorkload(userId: string, projectId?: string) {
  const where: any = { assignedTo: userId };
  if (projectId) where.projectId = projectId;

  const tasks = await prisma.task.findMany({ where });
  const now = new Date();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const overdueTasks = tasks.filter(t => t.dueDate < now && t.status !== 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const tasksByPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  const upcomingDeadlines = tasks
    .filter(t => t.status !== 'completed' && t.dueDate > now)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  return { totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks, completionRate, tasksByPriority, upcomingDeadlines };
}