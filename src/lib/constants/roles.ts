// src/lib/constants/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  TEAM_MEMBER: 'team_member',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.PROJECT_MANAGER]: 'Project Manager',
  [ROLES.TEAM_MEMBER]: 'Team Member',
};

export const ROLE_LEVELS: Record<Role, number> = {
  [ROLES.ADMIN]: 3,
  [ROLES.PROJECT_MANAGER]: 2,
  [ROLES.TEAM_MEMBER]: 1,
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [ROLES.ADMIN]: [
    'create_project',
    'edit_project',
    'delete_project',
    'manage_members',
    'manage_roles',
    'view_analytics',
    'export_data',
    'manage_system',
  ],
  [ROLES.PROJECT_MANAGER]: [
    'create_project',
    'edit_project',
    'manage_members',
    'view_analytics',
    'export_data',
  ],
  [ROLES.TEAM_MEMBER]: [],
};