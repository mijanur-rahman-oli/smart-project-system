// src/lib/validations/task.schema.ts
import { z } from 'zod';

export const priorityEnum = z.enum(['high', 'medium', 'low']);
export const taskStatusEnum = z.enum(['todo', 'in_progress', 'completed']);

export const createTaskSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string()
    .min(3, 'Task title must be at least 3 characters')
    .max(200, 'Task title must not exceed 200 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional()
    .nullable(),
  assignedTo: z.string().cuid().optional().nullable(),
  dueDate: z.date({ required_error: 'Due date is required' })
    .min(new Date(new Date().setHours(0, 0, 0, 0)), 'Due date cannot be in the past'),
  priority: priorityEnum.default('medium'),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().cuid(),
  status: taskStatusEnum.optional(),
});

export const updateTaskStatusSchema = z.object({
  id: z.string().cuid(),
  status: taskStatusEnum,
  completedAt: z.date().optional().nullable(),
});

export const assignTaskSchema = z.object({
  taskId: z.string().cuid(),
  assignedTo: z.string().cuid().nullable(),
});

export const bulkUpdateTaskStatusSchema = z.object({
  taskIds: z.array(z.string().cuid()),
  status: taskStatusEnum,
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  projectId: z.string().cuid().optional(),
  assignedTo: z.string().cuid().optional(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;