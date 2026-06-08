// src/lib/validations/api.schemas.ts
import { z } from 'zod';

// Base schemas
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Response schemas
export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }).optional(),
  });

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

// Search schema
export const searchQuerySchema = z.object({
  q: z.string().min(1),
  type: z.enum(['project', 'task', 'user', 'all']).default('all'),
  projectStatus: z.array(z.string()).optional(),
  taskStatus: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  assignedTo: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});