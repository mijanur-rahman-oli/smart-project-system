// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['project', 'task', 'user', 'all']).default('all'),
  projectStatus: z.array(z.string()).optional(),
  taskStatus: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  assignedTo: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// POST /api/search - Advanced search across entities
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = searchSchema.parse(body);

    const { query, type, page, limit } = validatedData;
    const skip = (page - 1) * limit;
    
    const results: any[] = [];
    let total = 0;

    // Build access filters
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
    if (type === 'all' || type === 'project') {
      const projectWhere: any = {
        id: { in: accessibleProjectIds },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (validatedData.projectStatus?.length) {
        projectWhere.status = { in: validatedData.projectStatus };
      }

      const projects = await prisma.project.findMany({
        where: projectWhere,
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { tasks: true, members: true },
          },
        },
        skip: type === 'project' ? skip : 0,
        take: type === 'project' ? limit : 100,
      });

      const formattedProjects = projects.map(p => ({
        id: p.id,
        type: 'project',
        title: p.name,
        description: p.description || 'No description',
        url: `/dashboard/projects/${p.id}`,
        metadata: {
          status: p.status,
          deadline: p.deadline,
          creator: p.creator.name,
          taskCount: p._count.tasks,
          memberCount: p._count.members,
        },
        score: calculateRelevanceScore(query, p.name, p.description || ''),
        createdAt: p.createdAt,
      }));

      if (type === 'project') {
        total = await prisma.project.count({ where: projectWhere });
        results.push(...formattedProjects);
      } else {
        results.push(...formattedProjects);
      }
    }

    // Search Tasks
    if (type === 'all' || type === 'task') {
      const taskWhere: any = {
        projectId: { in: accessibleProjectIds },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (validatedData.taskStatus?.length) {
        taskWhere.status = { in: validatedData.taskStatus };
      }

      if (validatedData.priority?.length) {
        taskWhere.priority = { in: validatedData.priority };
      }

      if (validatedData.assignedTo?.length) {
        taskWhere.assignedTo = { in: validatedData.assignedTo };
      }

      if (validatedData.dateFrom || validatedData.dateTo) {
        taskWhere.dueDate = {};
        if (validatedData.dateFrom) {
          taskWhere.dueDate.gte = new Date(validatedData.dateFrom);
        }
        if (validatedData.dateTo) {
          taskWhere.dueDate.lte = new Date(validatedData.dateTo);
        }
      }

      const tasks = await prisma.task.findMany({
        where: taskWhere,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          _count: {
            select: { comments: true, attachments: true },
          },
        },
        skip: type === 'task' ? skip : 0,
        take: type === 'task' ? limit : 100,
      });

      const formattedTasks = tasks.map(t => ({
        id: t.id,
        type: 'task',
        title: t.title,
        description: t.description || 'No description',
        url: `/dashboard/projects/${t.projectId}?task=${t.id}`,
        metadata: {
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          assignee: t.assignee?.name,
          projectName: t.project.name,
          commentCount: t._count.comments,
          attachmentCount: t._count.attachments,
        },
        score: calculateRelevanceScore(query, t.title, t.description || ''),
        createdAt: t.createdAt,
      }));

      if (type === 'task') {
        total = await prisma.task.count({ where: taskWhere });
        results.push(...formattedTasks);
      } else {
        results.push(...formattedTasks);
      }
    }

    // Search Users
    if (type === 'all' || type === 'user') {
      const userWhere: any = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      };

      const users = await prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
        skip: type === 'user' ? skip : 0,
        take: type === 'user' ? limit : 100,
      });

      const formattedUsers = users.map(u => ({
        id: u.id,
        type: 'user',
        title: u.name,
        description: u.email,
        url: `/dashboard/members/${u.id}`,
        metadata: {
          role: u.role,
          avatarUrl: u.avatarUrl,
        },
        score: calculateRelevanceScore(query, u.name, u.email),
        createdAt: u.createdAt,
      }));

      if (type === 'user') {
        total = await prisma.user.count({ where: userWhere });
        results.push(...formattedUsers);
      } else {
        results.push(...formattedUsers);
      }
    }

    // Sort by relevance score
    const sortedResults = results.sort((a, b) => b.score - a.score);
    const paginatedResults = sortedResults.slice(skip, skip + limit);

    // Log search
    await logActivity({
      userId: user.id,
      action: 'SEARCH_PERFORMED',
      entityType: 'search',
      entityId: 'query',
      metadata: {
        query,
        resultCount: sortedResults.length,
        filters: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: sortedResults.length,
        totalPages: Math.ceil(sortedResults.length / limit),
      },
    });
  } catch (error) {
    console.error('POST /api/search error:', error);
    
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

function calculateRelevanceScore(query: string, title: string, description: string): number {
  if (!query) return 1;
  
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  let score = 0;
  
  // Exact match in title (highest score)
  if (titleLower === queryLower) {
    score += 100;
  }
  // Title starts with query
  else if (titleLower.startsWith(queryLower)) {
    score += 80;
  }
  // Query in title
  else if (titleLower.includes(queryLower)) {
    score += 60;
  }
  
  // Query in description
  if (descLower.includes(queryLower)) {
    score += 30;
  }
  
  // Word boundary matches
  const titleWords = titleLower.split(' ');
  const queryWords = queryLower.split(' ');
  
  for (const word of queryWords) {
    if (titleWords.includes(word)) {
      score += 20;
    }
  }
  
  return Math.min(score, 100);
}