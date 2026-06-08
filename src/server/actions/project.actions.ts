// src/server/actions/project.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { createProjectSchema, updateProjectSchema } from '@/lib/validations/project.schema';
import { getCurrentUser, requireAuth, requireRole } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { z } from 'zod';

export async function createProjectAction(formData: FormData) {
  try {
    const user = await requireAuth();
    await requireRole(['admin', 'project_manager']);

    const validatedData = createProjectSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') || null,
      deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string) : null,
      status: formData.get('status') || 'active',
    });

    const existingProject = await prisma.project.findFirst({
      where: { name: validatedData.name },
    });

    if (existingProject) {
      return { success: false, error: 'A project with this name already exists' };
    }

    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        deadline: validatedData.deadline,
        status: validatedData.status,
        createdBy: user.id,
      },
      include: { creator: { select: { id: true, name: true, email: true } } },
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

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) return { success: false, error: 'Project not found' };

    const isAuthorized = user.role === 'admin' || project.createdBy === user.id;
    if (!isAuthorized) {
      return { success: false, error: 'You do not have permission to update this project' };
    }

    const validatedData = updateProjectSchema.parse({
      id: projectId,
      name: formData.get('name') || undefined,
      description: formData.get('description') || null,
      deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string) : undefined,
      status: formData.get('status') || undefined,
    });

    if (validatedData.name && validatedData.name !== project.name) {
      const duplicate = await prisma.project.findFirst({
        where: { name: validatedData.name, id: { not: projectId } },
      });
      if (duplicate) {
        return { success: false, error: 'A project with this name already exists' };
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { ...validatedData, updatedAt: new Date() },
    });

    await logActivity({
      userId: user.id,
      action: 'PROJECT_UPDATED',
      entityType: 'project',
      entityId: projectId,
      metadata: { changes: validatedData, projectName: project.name },
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
      return { success: false, error: 'Only admins or project creators can delete projects' };
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

export async function getProjectAction(projectId: string) {
  try {
    const user = await requireAuth();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } } },
        tasks: { include: { assignee: true, comments: true }, orderBy: { createdAt: 'desc' } },
        _count: { select: { tasks: true, members: true } },
      },
    });

    if (!project) return { success: false, error: 'Project not found' };

    const hasAccess = project.createdBy === user.id ||
      project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) return { success: false, error: 'Access denied' };

    return { success: true, data: project };
  } catch (error) {
    return { success: false, error: 'Failed to fetch project' };
  }
}