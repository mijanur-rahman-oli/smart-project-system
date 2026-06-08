// tests/unit/auth/rbac.test.ts
import { checkPermission } from '@/lib/auth/rbac';
import { UserRole, Permission } from '@/types/auth';

describe('RBAC Permission System', () => {
  const testCases = [
    {
      role: 'admin' as UserRole,
      permission: 'create_project' as Permission,
      expected: true,
    },
    {
      role: 'admin' as UserRole,
      permission: 'delete_any_project' as Permission,
      expected: true,
    },
    {
      role: 'project_manager' as UserRole,
      permission: 'create_project' as Permission,
      expected: true,
    },
    {
      role: 'project_manager' as UserRole,
      permission: 'delete_any_project' as Permission,
      expected: false,
    },
    {
      role: 'team_member' as UserRole,
      permission: 'create_project' as Permission,
      expected: false,
    },
    {
      role: 'team_member' as UserRole,
      permission: 'edit_assigned_task' as Permission,
      expected: true,
    },
    {
      role: 'team_member' as UserRole,
      permission: 'assign_task' as Permission,
      expected: false,
    },
  ];

  testCases.forEach(({ role, permission, expected }) => {
    it(`should return ${expected} for ${role} with ${permission}`, () => {
      const result = checkPermission(role, permission);
      expect(result).toBe(expected);
    });
  });
});