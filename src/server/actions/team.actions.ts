// src/server/actions/team.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { sendEmail } from '@/server/services/email.service';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  projectId: z.string().cuid(),
  email: z.string().email(),
  role: z.enum(['team_member', 'project_manager']).default('team_member'),
});

export async function inviteTeamMemberAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const validatedData = inviteMemberSchema.parse({
      projectId: formData.get('projectId'),
      email: formData.get('email'),
      role: formData.get('role'),
    });

    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
      include: { members: true },
    });

    if (!project) return { success: false, error: 'Project not found' };

    const isAuthorized = user.role === 'admin' || project.createdBy === user.id;
    if (!isAuthorized) {
      return { success: false, error: 'You do not have permission to invite members' };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      const isAlreadyMember = project.members.some(m => m.userId === existingUser.id);
      if (isAlreadyMember) {
        return { success: false, error: 'User is already a member' };
      }

      await prisma.projectMember.create({
        data: { projectId: validatedData.projectId, userId: existingUser.id },
      });

      await logActivity({
        userId: user.id,
        action: 'MEMBER_ADDED',
        entityType: 'project',
        entityId: validatedData.projectId,
        metadata: { addedUserEmail: validatedData.email },
      });

      return { success: true, message: 'Member added successfully' };
    }

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.teamInvitation.create({
      data: {
        projectId: validatedData.projectId,
        email: validatedData.email,
        invitedBy: user.id,
        role: validatedData.role,
        token,
        expiresAt,
      },
    });

    await sendEmail({
      to: validatedData.email,
      subject: `Invitation to join ${project.name}`,
      html: `
        <h2>You've been invited to join ${project.name}</h2>
        <p>${user.name} has invited you to join the project.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}">Accept Invitation</a>
      `,
    });

    return { success: true, message: 'Invitation sent successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to send invitation' };
  }
}

export async function removeTeamMemberAction(projectId: string, userId: string) {
  try {
    const user = await requireAuth();

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: 'Project not found' };

    if (project.createdBy === userId) {
      return { success: false, error: 'Cannot remove the project creator' };
    }

    const isAuthorized = user.role === 'admin' || project.createdBy === user.id;
    if (!isAuthorized) {
      return { success: false, error: 'Insufficient permissions' };
    }

    await prisma.task.updateMany({
      where: { projectId, assignedTo: userId },
      data: { assignedTo: null },
    });

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