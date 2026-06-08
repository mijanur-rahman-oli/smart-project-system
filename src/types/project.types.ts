// src/types/project.types.ts
export type ProjectStatus = 'active' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  members?: ProjectMember[];
  tasks?: Task[];
  _count?: {
    tasks: number;
    members: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  joinedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  deadline: Date;
  status?: ProjectStatus;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'deadline';
  sortOrder?: 'asc' | 'desc';
}

import { Task } from './task.types';