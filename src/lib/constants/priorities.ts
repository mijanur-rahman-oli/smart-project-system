// src/lib/constants/priorities.ts
export const PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type Priority = typeof PRIORITIES[keyof typeof PRIORITIES];

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITIES.HIGH]: 'High',
  [PRIORITIES.MEDIUM]: 'Medium',
  [PRIORITIES.LOW]: 'Low',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [PRIORITIES.HIGH]: 'red',
  [PRIORITIES.MEDIUM]: 'yellow',
  [PRIORITIES.LOW]: 'green',
};

export const PRIORITY_ICONS: Record<Priority, string> = {
  [PRIORITIES.HIGH]: '🔴',
  [PRIORITIES.MEDIUM]: '🟡',
  [PRIORITIES.LOW]: '🟢',
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  [PRIORITIES.HIGH]: 1,
  [PRIORITIES.MEDIUM]: 2,
  [PRIORITIES.LOW]: 3,
};