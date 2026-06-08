// src/lib/constants/statuses.ts
export const PROJECT_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
} as const;

export type ProjectStatus = typeof PROJECT_STATUSES[keyof typeof PROJECT_STATUSES];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [PROJECT_STATUSES.ACTIVE]: 'Active',
  [PROJECT_STATUSES.COMPLETED]: 'Completed',
  [PROJECT_STATUSES.ON_HOLD]: 'On Hold',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  [PROJECT_STATUSES.ACTIVE]: 'green',
  [PROJECT_STATUSES.COMPLETED]: 'blue',
  [PROJECT_STATUSES.ON_HOLD]: 'yellow',
};

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TASK_STATUSES.TODO]: 'To Do',
  [TASK_STATUSES.IN_PROGRESS]: 'In Progress',
  [TASK_STATUSES.COMPLETED]: 'Completed',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TASK_STATUSES.TODO]: 'gray',
  [TASK_STATUSES.IN_PROGRESS]: 'blue',
  [TASK_STATUSES.COMPLETED]: 'green',
};