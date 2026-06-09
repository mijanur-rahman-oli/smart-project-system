// src/server/actions/project.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth, requireRole } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional().nullable(),
  deadline: z.string().datetime(),
  status: z.enum(['active', 'completed', 'on_hold']).default('active'),
});

const updateProjectSchema = createProjectSchema.partial();

export async function getProjectsAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const status = formData.get('status') as string;
    const search = formData.get('search') as string;

    const where: any = {};
    if (user.role !== 'admin') {
      where.OR = [
        { createdBy: user.id },
        { members: { some: { userId: user.id } } },
      ];
    }
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: projects };
  } catch (error) {
    console.error('Get projects error:', error);
    return { success: false, error: 'Failed to fetch projects' };
  }
}

export async function getProjectAction(projectId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
            _count: { select: { comments: true, attachments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { tasks: true, members: true } },
      },
    });

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    const hasAccess = project.createdBy === user.id ||
      project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, data: project };
  } catch (error) {
    console.error('Get project error:', error);
    return { success: false, error: 'Failed to fetch project' };
  }
}

export async function createProjectAction(formData: FormData) {
  try {
    const user = await requireAuth();
    
    if (!['admin', 'project_manager'].includes(user.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const validated = createProjectSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') || null,
      deadline: formData.get('deadline'),
      status: formData.get('status') || 'active',
    });

    const existingProject = await prisma.project.findFirst({
      where: { name: validated.name },
    });

    if (existingProject) {
      return { success: false, error: 'A project with this name already exists' };
    }

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        description: validated.description,
        deadline: new Date(validated.deadline),
        status: validated.status,
        createdBy: user.id,
      },
    });

    await prisma.projectMember.create({
      data: { projectId: project.id, userId: user.id },
    });

    await logActivity({
      userId: user.id,
      action: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: project.id,
      metadata: { projectName: project.name },
    });

    revalidatePath('/dashboard/projects');
    return { success: true, data: project, message: 'Project created successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to create project' };
  }
}

export async function updateProjectAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const projectId = formData.get('id') as string;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: 'Project not found' };

    const isAuthorized = user.role === 'admin' || project.createdBy === user.id;
    if (!isAuthorized) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const validated = updateProjectSchema.parse({
      name: formData.get('name') || undefined,
      description: formData.get('description') || null,
      deadline: formData.get('deadline') || undefined,
      status: formData.get('status') || undefined,
    });

    if (validated.name && validated.name !== project.name) {
      const duplicate = await prisma.project.findFirst({
        where: { name: validated.name, id: { not: projectId } },
      });
      if (duplicate) {
        return { success: false, error: 'Project name already exists' };
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...validated,
        deadline: validated.deadline ? new Date(validated.deadline) : undefined,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'PROJECT_UPDATED',
      entityType: 'project',
      entityId: projectId,
      metadata: { projectName: project.name },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, data: updatedProject, message: 'Project updated successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to update project' };
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const user = await requireAuth();

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: 'Project not found' };

    const isAuthorized = user.role === 'admin' || project.createdBy === user.id;
    if (!isAuthorized) {
      return { success: false, error: 'Insufficient permissions' };
    }

    await logActivity({
      userId: user.id,
      action: 'PROJECT_DELETED',
      entityType: 'project',
      entityId: projectId,
      metadata: { projectName: project.name },
    });

    await prisma.project.delete({ where: { id: projectId } });

    revalidatePath('/dashboard/projects');
    return { success: true, message: 'Project deleted successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to delete project' };
  }
}

export async function addProjectMemberAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const projectId = formData.get('projectId') as string;
    const email = formData.get('email') as string;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: 'Project not found' };

    const isAuthorized = user.role === 'admin' || project.createdBy === user.id;
    if (!isAuthorized) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      return { success: false, error: 'User not found' };
    }

    const existingMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: userToAdd.id },
    });

    if (existingMember) {
      return { success: false, error: 'User is already a member' };
    }

    await prisma.projectMember.create({
      data: { projectId, userId: userToAdd.id },
    });

    await logActivity({
      userId: user.id,
      action: 'MEMBER_ADDED',
      entityType: 'project',
      entityId: projectId,
      metadata: { addedUser: email },
    });

    revalidatePath(`/dashboard/projects/${projectId}/members`);
    return { success: true, message: 'Member added successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to add member' };
  }
}

export async function removeProjectMemberAction(projectId: string, userId: string) {
  try {
    const user = await requireAuth();

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: 'Project not found' };

    if (project.createdBy === userId) {
      return { success: false, error: 'Cannot remove project creator' };
    }

    const isAuthorized = user.role === 'admin' || project.createdBy === user.id;
    if (!isAuthorized) {
      return { success: false, error: 'Insufficient permissions' };
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    await logActivity({
      userId: user.id,
      action: 'MEMBER_REMOVED',
      entityType: 'project',
      entityId: projectId,
      metadata: { removedUserId: userId },
    });

    revalidatePath(`/dashboard/projects/${projectId}/members`);
    return { success: true, message: 'Member removed successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to remove member' };
  }
}