// src/lib/validations/comment.schema.ts
import { z } from 'zod';

export const createCommentSchema = z.object({
  taskId: z.string().cuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
  richContent: z.any().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  richContent: z.any().optional(),
});

export const commentQuerySchema = z.object({
  taskId: z.string().cuid(),
});

export const addReactionSchema = z.object({
  commentId: z.string().cuid(),
  emoji: z.string().emoji(),
});