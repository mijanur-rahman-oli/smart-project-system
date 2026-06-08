// src/app/api/projects/[id]/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const createTaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().max(2000).optional().nullable(),
  assignedTo: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

const idParamSchema = z.object({
  id: z.string().cuid('Invalid project ID'),
});

// GET /api/projects/:id/tasks - Get project tasks
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
    const searchParams = request.nextUrl.searchParams;
    
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');

    const where: any = { projectId: id };

    if (status && ['todo', 'in_progress', 'completed'].includes(status)) {
      where.status = status;
    }

    if (priority && ['high', 'medium', 'low'].includes(priority)) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
      orderBy: [
        { priority: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('GET /api/projects/:id/tasks error:', error);
    
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

// POST /api/projects/:id/tasks - Create task in project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = idParamSchema.parse(params);

    // Check project access
    const project = await prisma.project.findUnique({
      where: { id },
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

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Check for duplicate task title
    const existingTask = await prisma.task.findFirst({
      where: {
        projectId: id,
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
        projectId: id,
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
        projectId: id,
        assignedTo: task.assignedTo,
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Task created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/:id/tasks error:', error);
    
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