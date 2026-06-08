// src/server/actions/comment.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { createCommentSchema, updateCommentSchema } from '@/lib/validations/comment.schema';
import { getCurrentUser, requireAuth, checkProjectAccess } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { uploadFile } from '@/server/services/upload.service';
import { z } from 'zod';

export async function createCommentAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const taskId = formData.get('taskId') as string;
    const content = formData.get('content') as string;
    const attachments = formData.getAll('attachments') as File[];

    const validatedData = createCommentSchema.parse({ taskId, content });

    // Check task access
    const task = await prisma.task.findUnique({
      where: { id: validatedData.taskId },
      include: { project: { include: { members: true } } },
    });

    if (!task) return { success: false, error: 'Task not found' };

    const hasAccess = task.project.createdBy === user.id ||
      task.project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) return { success: false, error: 'Access denied' };

    const comment = await prisma.taskComment.create({
      data: {
        taskId: validatedData.taskId,
        userId: user.id,
        content: validatedData.content,
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    // Upload attachments
    for (const file of attachments) {
      await uploadFile(file, 'comment', comment.id, user.id);
    }

    await logActivity({
      userId: user.id,
      action: 'COMMENT_ADDED',
      entityType: 'task',
      entityId: validatedData.taskId,
      metadata: { commentId: comment.id, commentPreview: content.substring(0, 100) },
    });

    revalidatePath(`/dashboard/tasks/${validatedData.taskId}`);
    return { success: true, data: comment, message: 'Comment added successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to add comment' };
  }
}

export async function updateCommentAction(commentId: string, content: string) {
  try {
    const user = await requireAuth();

    const existingComment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });

    if (!existingComment) return { success: false, error: 'Comment not found' };
    if (existingComment.userId !== user.id && user.role !== 'admin') {
      return { success: false, error: 'You can only edit your own comments' };
    }

    const validatedData = updateCommentSchema.parse({ content });

    const comment = await prisma.taskComment.update({
      where: { id: commentId },
      data: { content: validatedData.content, editedAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: user.id,
      action: 'COMMENT_UPDATED',
      entityType: 'comment',
      entityId: commentId,
      metadata: { taskId: existingComment.taskId },
    });

    revalidatePath(`/dashboard/tasks/${existingComment.taskId}`);
    return { success: true, data: comment, message: 'Comment updated successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to update comment' };
  }
}

export async function deleteCommentAction(commentId: string) {
  try {
    const user = await requireAuth();

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });

    if (!comment) return { success: false, error: 'Comment not found' };

    const isAuthorized = user.role === 'admin' ||
      comment.userId === user.id ||
      comment.task.project.createdBy === user.id;

    if (!isAuthorized) {
      return { success: false, error: 'You do not have permission to delete this comment' };
    }

    await logActivity({
      userId: user.id,
      action: 'COMMENT_DELETED',
      entityType: 'comment',
      entityId: commentId,
      metadata: { taskId: comment.taskId },
    });

    await prisma.taskComment.delete({ where: { id: commentId } });

    revalidatePath(`/dashboard/tasks/${comment.taskId}`);
    return { success: true, message: 'Comment deleted successfully' };
  } catch (error) {
    return { success: false, error: 'Failed to delete comment' };
  }
}

export async function getCommentsAction(taskId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: comments };
  } catch (error) {
    return { success: false, error: 'Failed to fetch comments' };
  }
}

export async function addReactionAction(commentId: string, emoji: string) {
  try {
    const user = await requireAuth();

    const reaction = await prisma.commentReaction.upsert({
      where: {
        commentId_userId_emoji: { commentId, userId: user.id, emoji },
      },
      update: {},
      create: { commentId, userId: user.id, emoji },
    });

    return { success: true, data: reaction };
  } catch (error) {
    return { success: false, error: 'Failed to add reaction' };
  }
}

export async function removeReactionAction(commentId: string, emoji: string) {
  try {
    const user = await requireAuth();

    await prisma.commentReaction.delete({
      where: {
        commentId_userId_emoji: { commentId, userId: user.id, emoji },
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to remove reaction' };
  }
}