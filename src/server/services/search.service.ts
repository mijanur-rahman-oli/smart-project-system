// src/server/services/search.service.ts
import { prisma } from '@/lib/db/prisma';

export async function searchTasks(query: string, projectIds: string[]) {
  return prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: { assignee: true, project: true },
    take: 20,
  });
}

export async function searchProjects(query: string, userId: string, isAdmin: boolean) {
  const where: any = {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ],
  };

  if (!isAdmin) {
    where.OR = [
      { createdBy: userId },
      { members: { some: { userId } } },
    ];
  }

  return prisma.project.findMany({ where, include: { creator: true }, take: 20 });
}

export async function searchUsers(query: string) {
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    take: 20,
  });
}

export function calculateRelevanceScore(query: string, title: string, description: string): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  let score = 0;

  if (titleLower === queryLower) score += 100;
  else if (titleLower.startsWith(queryLower)) score += 80;
  else if (titleLower.includes(queryLower)) score += 60;

  if (description.toLowerCase().includes(queryLower)) score += 30;
  if (titleLower.split(' ').some(word => queryLower.split(' ').includes(word))) score += 20;

  return Math.min(score, 100);
}