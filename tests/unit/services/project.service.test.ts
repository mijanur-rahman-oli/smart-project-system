// tests/unit/services/project.service.test.ts
import { prisma } from '@/lib/db/prisma';
import { createProject, updateProject, deleteProject } from '@/server/services/project.service';
import { logActivity } from '@/server/services/activity.service';

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    project: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/server/services/activity.service', () => ({
  logActivity: jest.fn(),
}));

describe('Project Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        deadline: new Date(),
        status: 'active',
        createdBy: 'user123',
      };

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue(mockProject);

      const result = await createProject({
        name: 'Test Project',
        description: 'Test Description',
        deadline: new Date(),
        createdBy: 'user123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
      expect(logActivity).toHaveBeenCalled();
    });

    it('should fail if project name already exists', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      const result = await createProject({
        name: 'Existing Project',
        description: 'Test',
        deadline: new Date(),
        createdBy: 'user123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('A project with this name already exists');
    });

    it('should validate deadline is in the future', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = await createProject({
        name: 'Test Project',
        description: 'Test',
        deadline: pastDate,
        createdBy: 'user123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deadline must be a future date');
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const existingProject = {
        id: '1',
        name: 'Old Name',
        createdBy: 'user123',
      };

      const updatedProject = {
        ...existingProject,
        name: 'New Name',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(existingProject);
      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      const result = await updateProject('1', { name: 'New Name' }, 'user123', 'team_member');

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New Name');
    });

    it('should prevent non-admin from updating project they dont own', async () => {
      const existingProject = {
        id: '1',
        name: 'Test',
        createdBy: 'other-user',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(existingProject);

      const result = await updateProject('1', { name: 'New Name' }, 'user123', 'team_member');

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to update this project');
    });
  });
});