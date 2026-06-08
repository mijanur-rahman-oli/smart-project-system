// src/lib/validations/project.schema.ts
import { z } from 'zod';

export const projectStatusEnum = z.enum(['active', 'completed', 'on_hold']);
export type ProjectStatus = z.infer<typeof projectStatusEnum>;

export const createProjectSchema = z.object({
  name: z.string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must not exceed 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .nullable(),
  deadline: z.date({ required_error: 'Deadline is required' })
    .min(new Date(new Date().setHours(0, 0, 0, 0)), 'Deadline must be a future date'),
  status: projectStatusEnum.default('active'),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().cuid(),
});

export const addProjectMemberSchema = z.object({
  projectId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.enum(['team_member', 'project_manager']).default('team_member'),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: projectStatusEnum.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'deadline']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;