// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

const uploadSchema = z.object({
  entityType: z.enum(['task', 'comment']),
  entityId: z.string().cuid(),
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/json',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/upload - Upload a file
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

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} is not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Check access based on entity type
    let hasAccess = false;
    let taskId = '';

    if (validatedData.entityType === 'task') {
      const task = await prisma.task.findUnique({
        where: { id: validatedData.entityId },
        include: {
          project: {
            include: { members: true },
          },
        },
      });

      if (task) {
        taskId = task.id;
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
                include: { members: true },
              },
            },
          },
        },
      });

      if (comment) {
        taskId = comment.taskId;
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

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `${validatedData.entityType}s/${validatedData.entityId}/${timestamp}-${safeFileName}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Save to database
    let attachment;
    if (validatedData.entityType === 'task') {
      attachment = await prisma.taskAttachment.create({
        data: {
          taskId: validatedData.entityId,
          fileName: file.name,
          fileUrl: blob.url,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: user.id,
        },
      });
    } else {
      attachment = await prisma.commentAttachment.create({
        data: {
          commentId: validatedData.entityId,
          fileUrl: blob.url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
      });
    }

    await logActivity({
      userId: user.id,
      action: 'ATTACHMENT_UPLOADED',
      entityType: validatedData.entityType === 'task' ? 'task' : 'comment',
      entityId: taskId,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        attachmentId: attachment.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        url: blob.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
      message: 'File uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    
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