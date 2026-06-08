// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const createTaskSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().max(2000).optional().nullable(),
  assignedTo: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  projectId: z.string().cuid().optional(),
  assignedTo: z.string().cuid().optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/tasks - List all tasks with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      projectId: searchParams.get('projectId'),
      assignedTo: searchParams.get('assignedTo'),
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    // Build where clause for access control
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

    const where: any = {
      projectId: { in: accessibleProjectIds },
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.assignedTo) {
      where.assignedTo = query.assignedTo;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true, status: true },
          },
          _count: {
            select: { comments: true, attachments: true },
          },
        },
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Check project access
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
      include: { members: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const hasAccess = project.createdBy === user.id ||
      project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check for duplicate task title
    const existingTask = await prisma.task.findFirst({
      where: {
        projectId: validatedData.projectId,
        title: validatedData.title,
      },
    });

    if (existingTask) {
      return NextResponse.json(
        { success: false, error: 'A task with this title already exists in this project' },
        { status: 409 }
      );
    }

    const task = await prisma.task.create({
      data: {
        projectId: validatedData.projectId,
        title: validatedData.title,
        description: validatedData.description,
        assignedTo: validatedData.assignedTo,
        createdBy: user.id,
        dueDate: new Date(validatedData.dueDate),
        priority: validatedData.priority,
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
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: task.id,
      metadata: {
        taskTitle: task.title,
        projectId: task.projectId,
        assignedTo: task.assignedTo,
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Task created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    
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