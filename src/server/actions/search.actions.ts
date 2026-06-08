// src/server/actions/search.actions.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

interface SearchFilters {
  type?: 'project' | 'task' | 'user' | 'all';
  projectStatus?: string[];
  taskStatus?: string[];
  priority?: string[];
  assignedTo?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export async function searchAction(options: { query: string; filters?: SearchFilters; page?: number; limit?: number }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { query, filters = {}, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const results: any[] = [];

    // Build accessible project IDs
    let accessibleProjectIds: string[] = [];
    if (user.role === 'admin') {
      const allProjects = await prisma.project.findMany({ select: { id: true } });
      accessibleProjectIds = allProjects.map(p => p.id);
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

    // Search Projects
    if (filters.type === 'all' || filters.type === 'project') {
      const projectWhere: any = {
        id: { in: accessibleProjectIds },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };
      if (filters.projectStatus?.length) {
        projectWhere.status = { in: filters.projectStatus };
      }

      const projects = await prisma.project.findMany({
        where: projectWhere,
        include: { creator: { select: { id: true, name: true } }, _count: { select: { tasks: true, members: true } } },
        take: filters.type === 'project' ? limit : 100,
      });

      results.push(...projects.map(p => ({
        id: p.id,
        type: 'project',
        title: p.name,
        description: p.description || 'No description',
        url: `/dashboard/projects/${p.id}`,
        metadata: { status: p.status, deadline: p.deadline, creator: p.creator.name, taskCount: p._count.tasks, memberCount: p._count.members },
        score: calculateRelevanceScore(query, p.name, p.description || ''),
        createdAt: p.createdAt,
      })));
    }

    // Search Tasks
    if (filters.type === 'all' || filters.type === 'task') {
      const taskWhere: any = {
        projectId: { in: accessibleProjectIds },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };
      if (filters.taskStatus?.length) taskWhere.status = { in: filters.taskStatus };
      if (filters.priority?.length) taskWhere.priority = { in: filters.priority };
      if (filters.assignedTo?.length) taskWhere.assignedTo = { in: filters.assignedTo };
      if (filters.dateFrom || filters.dateTo) {
        taskWhere.dueDate = {};
        if (filters.dateFrom) taskWhere.dueDate.gte = filters.dateFrom;
        if (filters.dateTo) taskWhere.dueDate.lte = filters.dateTo;
      }

      const tasks = await prisma.task.findMany({
        where: taskWhere,
        include: { assignee: true, project: true, _count: { select: { comments: true, attachments: true } } },
        take: filters.type === 'task' ? limit : 100,
      });

      results.push(...tasks.map(t => ({
        id: t.id,
        type: 'task',
        title: t.title,
        description: t.description || 'No description',
        url: `/dashboard/tasks/${t.id}`,
        metadata: { status: t.status, priority: t.priority, dueDate: t.dueDate, assignee: t.assignee?.name, projectName: t.project.name },
        score: calculateRelevanceScore(query, t.title, t.description || ''),
        createdAt: t.createdAt,
      })));
    }

    // Search Users
    if ((filters.type === 'all' || filters.type === 'user') && user.role === 'admin') {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
        take: filters.type === 'user' ? limit : 100,
      });

      results.push(...users.map(u => ({
        id: u.id,
        type: 'user',
        title: u.name,
        description: u.email,
        url: `/dashboard/users/${u.id}`,
        metadata: { role: u.role, avatarUrl: u.avatarUrl },
        score: calculateRelevanceScore(query, u.name, u.email),
        createdAt: u.createdAt,
      })));
    }

    // Sort and paginate
    const sortedResults = results.sort((a, b) => b.score - a.score);
    const paginatedResults = sortedResults.slice(skip, skip + limit);

    await logActivity({
      userId: user.id,
      action: 'SEARCH_PERFORMED',
      entityType: 'search',
      entityId: 'query',
      metadata: { query, resultCount: sortedResults.length },
    });

    return {
      success: true,
      data: paginatedResults,
      pagination: { page, limit, total: sortedResults.length, totalPages: Math.ceil(sortedResults.length / limit) },
    };
  } catch (error) {
    console.error('Search error:', error);
    return { success: false, error: 'Failed to perform search' };
  }
}

export async function getSearchSuggestions(query: string, limit: number = 10) {
  try {
    const user = await getCurrentUser();
    if (!user || query.length < 2) {
      return { success: true, data: [] };
    }

    const suggestions = new Set<string>();

    const projects = await prisma.project.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: limit,
      select: { name: true },
    });
    projects.forEach(p => suggestions.add(p.name));

    const tasks = await prisma.task.findMany({
      where: { title: { contains: query, mode: 'insensitive' } },
      take: limit,
      select: { title: true },
    });
    tasks.forEach(t => suggestions.add(t.title));

    const users = await prisma.user.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: limit,
      select: { name: true },
    });
    users.forEach(u => suggestions.add(u.name));

    return { success: true, data: Array.from(suggestions).slice(0, limit) };
  } catch (error) {
    console.error('Get search suggestions error:', error);
    return { success: false, error: 'Failed to get suggestions' };
  }
}

export async function saveSearchAction(name: string, query: string, filters?: any) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const savedSearch = await prisma.savedSearch.create({
      data: { userId: user.id, name, query, filters: filters || {} },
    });

    return { success: true, data: savedSearch, message: 'Search saved successfully' };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'A saved search with this name already exists' };
    }
    return { success: false, error: 'Failed to save search' };
  }
}

export async function getSavedSearchesAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: savedSearches };
  } catch (error) {
    console.error('Get saved searches error:', error);
    return { success: false, error: 'Failed to fetch saved searches' };
  }
}

function calculateRelevanceScore(query: string, title: string, description: string): number {
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