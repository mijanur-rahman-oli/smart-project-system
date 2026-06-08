// src/app/api/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';
import { sendCommentNotification } from '@/server/services/notification.service';

const createCommentSchema = z.object({
  taskId: z.string().cuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
  richContent: z.any().optional(),
});

const querySchema = z.object({
  taskId: z.string().cuid(),
});

// GET /api/comments - Get comments for a task
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const { taskId } = querySchema.parse({
      taskId: searchParams.get('taskId'),
    });

    // Check task access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const hasAccess = task.project.createdBy === user.id ||
      task.project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format reactions
    const formattedComments = comments.map(comment => {
      const reactions = comment.reactions.reduce((acc, reaction) => {
        const existing = acc.find(r => r.emoji === reaction.emoji);
        if (existing) {
          existing.count++;
          existing.users.push(reaction.user.name);
        } else {
          acc.push({
            emoji: reaction.emoji,
            count: 1,
            users: [reaction.user.name],
          });
        }
        return acc;
      }, [] as any[]);

      return {
        ...comment,
        reactions,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedComments,
    });
  } catch (error) {
    console.error('GET /api/comments error:', error);
    
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

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Check task access
    const task = await prisma.task.findUnique({
      where: { id: validatedData.taskId },
      include: {
        project: {
          include: {
            members: true,
          },
        },
        assignee: true,
        creator: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const hasAccess = task.project.createdBy === user.id ||
      task.project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: validatedData.taskId,
        userId: user.id,
        content: validatedData.content,
        richContent: validatedData.richContent,
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
      action: 'COMMENT_ADDED',
      entityType: 'task',
      entityId: validatedData.taskId,
      metadata: {
        commentId: comment.id,
        commentPreview: validatedData.content.substring(0, 200),
        taskTitle: task.title,
      },
    });

    // Send notifications
    await sendCommentNotification({
      commentId: comment.id,
      taskId: validatedData.taskId,
      commenterId: user.id,
      commenterName: user.name,
      content: validatedData.content,
      taskTitle: task.title,
      projectName: task.project.name,
      assigneeId: task.assignedTo,
      creatorId: task.createdBy,
    });

    return NextResponse.json({
      success: true,
      data: comment,
      message: 'Comment added successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/comments error:', error);
    
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