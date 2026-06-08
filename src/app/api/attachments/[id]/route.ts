// src/app/api/attachments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteFile } from '@/server/services/upload.service';
import { logActivity } from '@/server/services/activity.service';

const idParamSchema = z.object({
  id: z.string().cuid('Invalid attachment ID'),
});

// GET /api/attachments/:id - Get attachment details
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

    let attachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: {
              include: {
                members: true,
              },
            },
          },
        },
        uploader: {
          select: { id: true, name: true },
        },
      },
    });

    if (!attachment) {
      attachment = await prisma.commentAttachment.findUnique({
        where: { id },
        include: {
          comment: {
            include: {
              task: {
                include: {
                  project: {
                    include: {
                      members: true,
                    },
                  },
                },
              },
            },
          },
        },
      }) as any;
    }

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Check access
    const task = attachment.task || attachment.comment?.task;
    const hasAccess = task.project.createdBy === user.id ||
      task.project.members.some((m: any) => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    console.error('GET /api/attachments/:id error:', error);
    
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

// DELETE /api/attachments/:id - Delete attachment
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

    let attachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    let entityType: 'task' | 'comment' = 'task';

    if (!attachment) {
      attachment = await prisma.commentAttachment.findUnique({
        where: { id },
        include: {
          comment: {
            include: {
              task: {
                include: {
                  project: true,
                },
              },
            },
          },
        },
      }) as any;
      entityType = 'comment';
    }

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.role === 'admin';
    const isUploader = attachment.uploadedBy === user.id;
    const task = attachment.task || attachment.comment?.task;
    const isProjectCreator = task.project.createdBy === user.id;

    if (!isAdmin && !isUploader && !isProjectCreator) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this file' },
        { status: 403 }
      );
    }

    const result = await deleteFile(id, entityType, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    await logActivity({
      userId: user.id,
      action: 'ATTACHMENT_DELETED',
      entityType: entityType === 'task' ? 'task' : 'comment',
      entityId: attachment.taskId || attachment.commentId,
      metadata: {
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/attachments/:id error:', error);
    
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