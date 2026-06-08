// tests/unit/services/task.service.test.ts
import { prisma } from '@/lib/db/prisma';
import { createTask, updateTaskStatus, assignTask } from '@/server/services/task.service';

describe('Task Service', () => {
  describe('createTask', () => {
    it('should create a task with unique title per project', async () => {
      const mockTask = {
        id: '1',
        title: 'Unique Task',
        projectId: 'project1',
      };

      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await createTask({
        projectId: 'project1',
        title: 'Unique Task',
        dueDate: new Date(),
        createdBy: 'user123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject duplicate task titles in same project', async () => {
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing',
        title: 'Duplicate Task',
      });

      const result = await createTask({
        projectId: 'project1',
        title: 'Duplicate Task',
        dueDate: new Date(),
        createdBy: 'user123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('A task with this title already exists in the project');
    });

    it('should reject past due dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = await createTask({
        projectId: 'project1',
        title: 'New Task',
        dueDate: pastDate,
        createdBy: 'user123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Due date cannot be in the past');
    });
  });

  describe('updateTaskStatus', () => {
    it('should allow assignee to update status', async () => {
      const task = {
        id: '1',
        assignedTo: 'user123',
        status: 'todo',
        projectId: 'project1',
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(task);
      (prisma.task.update as jest.Mock).mockResolvedValue({ ...task, status: 'in_progress' });

      const result = await updateTaskStatus('1', 'in_progress', 'user123', 'team_member');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('in_progress');
    });

    it('should prevent status update for completed tasks', async () => {
      const task = {
        id: '1',
        status: 'completed',
        projectId: 'project1',
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(task);

      const result = await updateTaskStatus('1', 'in_progress', 'user123', 'team_member');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completed tasks cannot be modified');
    });
  });

  describe('assignTask', () => {
    it('should prevent reassigning completed tasks', async () => {
      const task = {
        id: '1',
        status: 'completed',
        assignedTo: 'user1',
        projectId: 'project1',
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(task);

      const result = await assignTask('1', 'user2', 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Completed tasks cannot be reassigned');
    });
  });
});