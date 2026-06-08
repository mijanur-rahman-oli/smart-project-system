// src/app/api/comments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  richContent: z.any().optional(),
});

const idParamSchema = z.object({
  id: z.string().cuid('Invalid comment ID'),
});

// PUT /api/comments/:id - Update comment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = idParamSchema.parse(params);

    const existingComment = await prisma.taskComment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!existingComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check permissions (only comment owner or admin can edit)
    if (existingComment.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own comments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    const comment = await prisma.taskComment.update({
      where: { id },
      data: {
        content: validatedData.content,
        richContent: validatedData.richContent,
        editedAt: new Date(),
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

    await logActivity({
      userId: user.id,
      action: 'COMMENT_UPDATED',
      entityType: 'comment',
      entityId: id,
      metadata: {
        taskId: existingComment.taskId,
        commentPreview: validatedData.content.substring(0, 200),
      },
    });

    return NextResponse.json({
      success: true,
      data: comment,
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/comments/:id error:', error);
    
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

// DELETE /api/comments/:id - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = idParamSchema.parse(params);

    const comment = await prisma.taskComment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.role === 'admin';
    const isOwner = comment.userId === user.id;
    const isProjectCreator = comment.task.project.createdBy === user.id;

    if (!isAdmin && !isOwner && !isProjectCreator) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this comment' },
        { status: 403 }
      );
    }

    await logActivity({
      userId: user.id,
      action: 'COMMENT_DELETED',
      entityType: 'comment',
      entityId: id,
      metadata: {
        taskId: comment.taskId,
        commentPreview: comment.content.substring(0, 200),
      },
    });

    await prisma.taskComment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/comments/:id error:', error);
    
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