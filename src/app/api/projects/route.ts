// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const createProjectSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  deadline: z.string().datetime(),
  status: z.enum(['active', 'completed', 'on_hold']).default('active'),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'completed', 'on_hold']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'deadline']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/projects - List all projects
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
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    // Build where clause for access control
    const where: any = {};
    
    if (user.role !== 'admin') {
      where.OR = [
        { createdBy: user.id },
        { members: { some: { userId: user.id } } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          _count: {
            select: { tasks: true, members: true },
          },
        },
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    
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

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Check role
    if (!['admin', 'project_manager'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    // Check for duplicate name
    const existingProject = await prisma.project.findFirst({
      where: { name: validatedData.name },
    });

    if (existingProject) {
      return NextResponse.json(
        { success: false, error: 'A project with this name already exists' },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        deadline: new Date(validatedData.deadline),
        status: validatedData.status,
        createdBy: user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Add creator as member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: project.id,
      metadata: {
        projectName: project.name,
        deadline: project.deadline,
      },
    });

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    
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