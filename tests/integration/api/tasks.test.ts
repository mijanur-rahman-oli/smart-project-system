// tests/integration/api/tasks.test.ts
import { createTestClient } from '../utils/test-client';
import { prisma } from '@/lib/db/prisma';
import { createTestUser, createTestProject, createTestTask } from '../utils/test-data';

describe('Tasks API Integration', () => {
  let testClient: any;
  let projectManager: any;
  let teamMember: any;
  let testProject: any;

  beforeAll(async () => {
    testClient = createTestClient();
    projectManager = await createTestUser({ role: 'project_manager' });
    teamMember = await createTestUser({ role: 'team_member' });
    testProject = await createTestProject({ createdBy: projectManager.id });
  });

  describe('GET /api/tasks', () => {
    it('should return tasks with pagination', async () => {
      await createTestTask({ projectId: testProject.id, assignedTo: teamMember.id });

      const response = await testClient.get('/api/tasks', {
        headers: { Authorization: `Bearer ${teamMember.token}` },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter tasks by status', async () => {
      await createTestTask({ projectId: testProject.id, status: 'todo' });
      await createTestTask({ projectId: testProject.id, status: 'completed' });

      const response = await testClient.get('/api/tasks?status=todo', {
        headers: { Authorization: `Bearer ${projectManager.token}` },
      });

      expect(response.body.data.every((t: any) => t.status === 'todo')).toBe(true);
    });

    it('should filter tasks by assignee', async () => {
      const response = await testClient.get(`/api/tasks?assignedTo=${teamMember.id}`, {
        headers: { Authorization: `Bearer ${projectManager.token}` },
      });

      expect(response.body.data.every((t: any) => t.assignedTo === teamMember.id)).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const newTask = {
        projectId: testProject.id,
        title: 'Integration Test Task',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
      };

      const response = await testClient.post('/api/tasks', newTask, {
        headers: { Authorization: `Bearer ${projectManager.token}` },
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newTask.title);
    });

    it('should reject duplicate task titles in same project', async () => {
      await createTestTask({ projectId: testProject.id, title: 'Duplicate Task' });

      const response = await testClient.post(
        '/api/tasks',
        {
          projectId: testProject.id,
          title: 'Duplicate Task',
          dueDate: new Date().toISOString(),
        },
        { headers: { Authorization: `Bearer ${projectManager.token}` } }
      );

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Task with this title already exists in the project');
    });
  });
});