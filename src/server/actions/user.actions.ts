// src/server/actions/user.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { updateUserSchema } from '@/lib/validations/user.schema';
import { hashPassword } from '@/lib/auth/password';
import { logActivity } from '@/server/services/activity.service';
import { z } from 'zod';

export async function updateUserAction(formData: FormData) {
  try {
    const currentUser = await requireAuth();
    const userId = formData.get('id') as string;

    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const validatedData = updateUserSchema.parse({
      name: formData.get('name') || undefined,
      email: formData.get('email') || undefined,
      bio: formData.get('bio') || undefined,
    });

    if (validatedData.email) {
      const existing = await prisma.user.findFirst({
        where: { email: validatedData.email, id: { not: userId } },
      });
      if (existing) return { success: false, error: 'Email already in use' };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, bio: true },
    });

    await logActivity({
      userId: currentUser.id,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: userId,
      metadata: { updatedFields: Object.keys(validatedData) },
    });

    revalidatePath('/dashboard/settings');
    return { success: true, data: updatedUser, message: 'Profile updated successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to update profile' };
  }
}

export async function changePasswordAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return { success: false, error: 'User not found' };

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValid) return { success: false, error: 'Current password is incorrect' };

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    await logActivity({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: user.id,
    });

    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to change password' };
  }
}

export async function getUsersAction(filters: { role?: string; search?: string }) {
  try {
    const user = await requireAuth();
    if (user.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const where: any = {};
    if (filters.role) where.role = filters.role;
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: 'Failed to fetch users' };
  }
}