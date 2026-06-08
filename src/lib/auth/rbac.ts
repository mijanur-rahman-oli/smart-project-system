// src/lib/auth/rbac.ts
export type UserRole = 'admin' | 'project_manager' | 'team_member';
export type Permission = 
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'view_all_projects'
  | 'manage_members'
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'assign_task'
  | 'view_all_tasks'
  | 'manage_roles'
  | 'view_analytics'
  | 'export_data'
  | 'manage_system';

const permissions: Record<UserRole, Permission[]> = {
  admin: [
    'create_project',
    'edit_project',
    'delete_project',
    'view_all_projects',
    'manage_members',
    'create_task',
    'edit_task',
    'delete_task',
    'assign_task',
    'view_all_tasks',
    'manage_roles',
    'view_analytics',
    'export_data',
    'manage_system',
  ],
  project_manager: [
    'create_project',
    'edit_project',
    'view_all_projects',
    'manage_members',
    'create_task',
    'edit_task',
    'assign_task',
    'view_all_tasks',
    'view_analytics',
    'export_data',
  ],
  team_member: [
    'edit_task',
    'view_all_tasks',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return permissions[role]?.includes(permission) || false;
}

export function canAccessResource(
  userRole: UserRole,
  userId: string,
  resourceOwnerId: string,
  resourceType: 'project' | 'task'
): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'project_manager' && resourceType === 'project') return true;
  if (userId === resourceOwnerId) return true;
  return false;
}

export function getRolePermissions(role: UserRole): Permission[] {
  return permissions[role] || [];
}