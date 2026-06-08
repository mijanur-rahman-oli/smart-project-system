// src/lib/utils/constants.ts
export const APP_NAME = 'ProjectFlow';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || `${APP_URL}/api`;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Date formats
export const DATE_FORMATS = {
  short: 'MMM dd, yyyy',
  long: 'MMMM do, yyyy',
  time: 'h:mm a',
  dateTime: 'MMM dd, yyyy h:mm a',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
};

// Status options
export const PROJECT_STATUSES = {
  active: { label: 'Active', color: 'green' },
  completed: { label: 'Completed', color: 'blue' },
  on_hold: { label: 'On Hold', color: 'yellow' },
} as const;

export const TASK_STATUSES = {
  todo: { label: 'To Do', color: 'gray' },
  in_progress: { label: 'In Progress', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
} as const;

export const PRIORITIES = {
  high: { label: 'High', color: 'red' },
  medium: { label: 'Medium', color: 'yellow' },
  low: { label: 'Low', color: 'green' },
} as const;

// User roles
export const USER_ROLES = {
  admin: { label: 'Administrator', level: 3 },
  project_manager: { label: 'Project Manager', level: 2 },
  team_member: { label: 'Team Member', level: 1 },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
  },
  projects: '/projects',
  tasks: '/tasks',
  comments: '/comments',
  notifications: '/notifications',
  users: '/users',
  analytics: '/analytics',
  search: '/search',
  upload: '/upload',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  theme: 'theme',
  language: 'language',
  recentSearches: 'recentSearches',
  sidebarCollapsed: 'sidebarCollapsed',
  dashboardWidgets: 'dashboardWidgets',
} as const;