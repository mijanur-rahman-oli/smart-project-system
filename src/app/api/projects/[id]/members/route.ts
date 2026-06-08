// src/app/api/projects/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { sendEmail } from '@/server/services/email.service';

const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['team_member', 'project_manager']).default('team_member'),
});

const idParamSchema = z.object({
  id: z.string().cuid('Invalid project ID'),
});

// GET /api/projects/:id/members - Get project members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = idParamSchema.parse(params);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
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
      data: project.members,
    });
  } catch (error) {
    console.error('GET /api/projects/:id/members error:', error);
    
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

// POST /api/projects/:id/members - Add member to project
export async function POST(
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
    const { email, role } = addMemberSchema.parse(body);

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already a member
    const isAlreadyMember = project.members.some(m => m.userId === userToAdd.id);
    if (isAlreadyMember) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this project' },
        { status: 409 }
      );
    }

    // Add member
    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: userToAdd.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update user role if needed (for project permissions)
    if (role === 'project_manager' && userToAdd.role !== 'project_manager') {
      await prisma.user.update({
        where: { id: userToAdd.id },
        data: { role: 'project_manager' },
      });
    }

    await logActivity({
      userId: user.id,
      action: 'MEMBER_ADDED',
      entityType: 'project',
      entityId: id,
      metadata: {
        addedUserId: userToAdd.id,
        addedUserEmail: userToAdd.email,
        projectName: project.name,
      },
    });

    // Send notification email
    await sendEmail({
      to: userToAdd.email,
      subject: `You've been added to ${project.name}`,
      html: `
        <h2>You've been added to a new project!</h2>
        <p>You have been added to <strong>${project.name}</strong> by ${user.name}.</p>
        <p>Click <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects/${id}">here</a> to view the project.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      data: member,
      message: 'Member added successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/:id/members error:', error);
    
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

// DELETE /api/projects/:id/members - Remove member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = idParamSchema.parse(params);
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Cannot remove project creator
    if (project.createdBy === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the project creator' },
        { status: 403 }
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

    // Reassign tasks assigned to this user
    await prisma.task.updateMany({
      where: {
        projectId: id,
        assignedTo: userId,
      },
      data: {
        assignedTo: null,
      },
    });

    // Remove member
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    const removedUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    await logActivity({
      userId: user.id,
      action: 'MEMBER_REMOVED',
      entityType: 'project',
      entityId: id,
      metadata: {
        removedUserId: userId,
        removedUserName: removedUser?.name,
        projectName: project.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('DELETE /api/projects/:id/members error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}