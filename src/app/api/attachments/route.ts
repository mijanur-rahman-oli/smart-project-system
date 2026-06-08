// src/app/api/attachments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { uploadFile } from '@/server/services/upload.service';
import { logActivity } from '@/server/services/activity.service';

const uploadSchema = z.object({
  entityType: z.enum(['task', 'comment']),
  entityId: z.string().cuid(),
});

// POST /api/attachments - Upload a file
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const validatedData = uploadSchema.parse({ entityType, entityId });

    // Check access based on entity type
    let hasAccess = false;

    if (validatedData.entityType === 'task') {
      const task = await prisma.task.findUnique({
        where: { id: validatedData.entityId },
        include: {
          project: {
            include: {
              members: true,
            },
          },
        },
      });

      if (task) {
        hasAccess = task.project.createdBy === user.id ||
          task.project.members.some(m => m.userId === user.id) ||
          user.role === 'admin';
      }
    } else if (validatedData.entityType === 'comment') {
      const comment = await prisma.taskComment.findUnique({
        where: { id: validatedData.entityId },
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
      });

      if (comment) {
        hasAccess = comment.task.project.createdBy === user.id ||
          comment.task.project.members.some(m => m.userId === user.id) ||
          user.role === 'admin';
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const result = await uploadFile(file, validatedData.entityType, validatedData.entityId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'File uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/attachments error:', error);
    
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