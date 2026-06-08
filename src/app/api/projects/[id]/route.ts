// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const updateProjectSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  deadline: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'on_hold']).optional(),
});

const idParamSchema = z.object({
  id: z.string().cuid('Invalid project ID'),
});

// GET /api/projects/:id - Get project by ID
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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            _count: {
              select: { comments: true, attachments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { tasks: true, members: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check access
    const hasAccess = project.createdBy === user.id ||
      project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('GET /api/projects/:id error:', error);
    
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

// PUT /api/projects/:id - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = idParamSchema.parse(params);

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

    // Check permissions
    const isAdmin = user.role === 'admin';
    const isCreator = project.createdBy === user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    // Check for duplicate name
    if (validatedData.name && validatedData.name !== project.name) {
      const existing = await prisma.project.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Project name already exists' },
          { status: 409 }
        );
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...validatedData,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logActivity({
      userId: user.id,
      action: 'PROJECT_UPDATED',
      entityType: 'project',
      entityId: id,
      metadata: {
        changes: validatedData,
        projectName: project.name,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/projects/:id error:', error);
    
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

// DELETE /api/projects/:id - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = idParamSchema.parse(params);

    const project = await prisma.project.findUnique({
      where: { id },
      include: { tasks: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.role === 'admin';
    const isCreator = project.createdBy === user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await logActivity({
      userId: user.id,
      action: 'PROJECT_DELETED',
      entityType: 'project',
      entityId: id,
      metadata: {
        projectName: project.name,
        taskCount: project.tasks.length,
      },
    });

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/projects/:id error:', error);
    
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