// src/lib/validations/user.schema.ts
import { z } from 'zod';

export const userRoleEnum = z.enum(['admin', 'project_manager', 'team_member']);

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: userRoleEnum.optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: userRoleEnum.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: userRoleEnum.default('team_member'),
});