// src/types/user.types.ts
export type UserRole = 'admin' | 'project_manager' | 'team_member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bio?: string | null;
  _count?: {
    projectsCreated: number;
    assignedTasks: number;
    comments: number;
  };
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface UserFilters {
  role?: UserRole;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserWorkload {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  upcomingDeadlines: Array<{
    taskId: string;
    taskTitle: string;
    dueDate: Date;
    priority: string;
  }>;
}