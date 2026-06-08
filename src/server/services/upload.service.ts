// src/server/services/upload.service.ts
import { put, del } from '@vercel/blob';
import { prisma } from '@/lib/db/prisma';
import { logActivity } from './activity.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/json',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadFile(file: File, entityType: 'task' | 'comment', entityId: string, userId: string) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const blobPath = `${entityType}s/${entityId}/${timestamp}-${safeFileName}`;

  const blob = await put(blobPath, file, { access: 'public' });

  if (entityType === 'task') {
    await prisma.taskAttachment.create({
      data: {
        taskId: entityId,
        fileName: file.name,
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: userId,
      },
    });
  } else {
    await prisma.commentAttachment.create({
      data: {
        commentId: entityId,
        fileUrl: blob.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  }

  await logActivity({
    userId,
    action: 'ATTACHMENT_UPLOADED',
    entityType: entityType === 'task' ? 'task' : 'comment',
    entityId,
    metadata: { fileName: file.name, fileSize: file.size },
  });

  return { url: blob.url, fileName: file.name, fileSize: file.size };
}

export async function deleteFile(attachmentId: string, entityType: 'task' | 'comment', userId: string) {
  let attachment;
  if (entityType === 'task') {
    attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
    if (attachment) await prisma.taskAttachment.delete({ where: { id: attachmentId } });
  } else {
    attachment = await prisma.commentAttachment.findUnique({ where: { id: attachmentId } });
    if (attachment) await prisma.commentAttachment.delete({ where: { id: attachmentId } });
  }

  if (attachment) {
    const urlParts = attachment.fileUrl.split('/');
    const blobPath = urlParts.slice(-3).join('/');
    await del(blobPath);
  }

  return { success: true };
}