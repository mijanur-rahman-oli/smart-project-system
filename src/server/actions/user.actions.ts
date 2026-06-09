// src/server/actions/user.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { logActivity } from '@/server/services/activity.service';
import { sendEmail } from '@/server/services/email.service';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'project_manager', 'team_member']).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'project_manager', 'team_member']).default('team_member'),
});

export async function getUsersAction(filters: { role?: string; search?: string }) {
  try {
    const user = await requireAuth();
    if (user.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const where: any = {};
    if (filters.role && filters.role !== 'all') where.role = filters.role;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            projectsCreated: true,
            assignedTasks: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error('Get users error:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

export async function updateUserRoleAction(userId: string, newRole: string) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
      select: { id: true, name: true, email: true, role: true },
    });

    await logActivity({
      userId: currentUser.id,
      action: 'USER_ROLE_UPDATED',
      entityType: 'user',
      entityId: userId,
      metadata: { newRole, targetUser: user.email },
    });

    revalidatePath('/dashboard/members');
    return { success: true, data: user, message: 'User role updated successfully' };
  } catch (error) {
    console.error('Update user role error:', error);
    return { success: false, error: 'Failed to update user role' };
  }
}

export async function inviteUserAction(formData: FormData) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const email = formData.get('email') as string;
    const role = formData.get('role') as string || 'team_member';

    const validated = inviteUserSchema.parse({ email, role });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + '!Aa1';
    const hashedPassword = await hashPassword(tempPassword);

    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.email.split('@')[0],
        passwordHash: hashedPassword,
        role: validated.role as any,
        isActive: true,
      },
    });

    // Send invitation email
    await sendEmail({
      to: validated.email,
      subject: 'Invitation to join ProjectFlow',
      html: `
        <h2>Welcome to ProjectFlow!</h2>
        <p>You have been invited to join ProjectFlow as a ${validated.role}.</p>
        <p>Your temporary password is: <strong>${tempPassword}</strong></p>
        <p>Please login and change your password immediately.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Click here to login</a>
      `,
    });

    await logActivity({
      userId: currentUser.id,
      action: 'USER_INVITED',
      entityType: 'user',
      entityId: newUser.id,
      metadata: { invitedEmail: validated.email, role: validated.role },
    });

    revalidatePath('/dashboard/members');
    return { success: true, message: 'Invitation sent successfully' };
  } catch (error) {
    console.error('Invite user error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to send invitation' };
  }
}

export async function deleteUserAction(userId: string) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot delete your own account' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await prisma.user.delete({ where: { id: userId } });

    await logActivity({
      userId: currentUser.id,
      action: 'USER_DELETED',
      entityType: 'user',
      entityId: userId,
      metadata: { deletedUser: user.email },
    });

    revalidatePath('/dashboard/members');
    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}