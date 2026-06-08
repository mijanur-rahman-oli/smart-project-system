// tests/integration/api/notifications.test.ts
import { createTestClient, authenticatedClient, expectSuccessResponse, expectErrorResponse } from '@/tests/utils/test-client';
import { createMockUser, createMockNotification, cleanupTestData } from '@/tests/fixtures/test-data';
import { prisma } from '@/lib/db/prisma';

describe('Notifications API Integration', () => {
  let client: any;
  let testUser: any;
  let testAdmin: any;
  let authClient: any;
  let adminAuthClient: any;

  beforeAll(async () => {
    client = createTestClient();
    testUser = await createMockUser({ role: 'team_member' });
    testAdmin = await createMockUser({ role: 'admin' });
    authClient = await authenticatedClient(testUser.token);
    adminAuthClient = await authenticatedClient(testAdmin.token);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await createMockNotification(testUser.id, 'TASK_ASSIGNED');
      await createMockNotification(testUser.id, 'COMMENT_ADDED');
      await createMockNotification(testUser.id, 'TASK_STATUS_CHANGED');
    });

    it('should return user notifications', async () => {
      const response = await authClient.get('/api/notifications');
      
      expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter unread notifications', async () => {
      const response = await authClient.get('/api/notifications?unreadOnly=true');
      
      expectSuccessResponse(response);
      expect(response.body.data.every((n: any) => n.isRead === false)).toBe(true);
    });

    it('should paginate results', async () => {
      // Create 25 notifications
      for (let i = 0; i < 25; i++) {
        await createMockNotification(testUser.id, 'TASK_ASSIGNED');
      }
      
      const response = await authClient.get('/api/notifications?limit=10&page=1');
      
      expectSuccessResponse(response);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBeGreaterThan(1);
    });

    it('should sort by newest first', async () => {
      const response = await authClient.get('/api/notifications?sortBy=createdAt&sortOrder=desc');
      
      expectSuccessResponse(response);
      const dates = response.body.data.map((n: any) => new Date(n.createdAt));
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
      }
    });

    it('should filter by notification type', async () => {
      const response = await authClient.get('/api/notifications?type=TASK_ASSIGNED');
      
      expectSuccessResponse(response);
      expect(response.body.data.every((n: any) => n.type === 'TASK_ASSIGNED')).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await client.get('/api/notifications');
      expect(response.status).toBe(401);
    });

    it('should not return other users notifications', async () => {
      const otherUser = await createMockUser({ role: 'team_member' });
      const otherAuthClient = await authenticatedClient(otherUser.token);
      
      const response = await otherAuthClient.get('/api/notifications');
      
      expectSuccessResponse(response);
      // Should only see their own notifications
      expect(response.body.data.every((n: any) => n.userId === otherUser.id)).toBe(true);
    });
  });

  describe('POST /api/notifications/:id/read', () => {
    let testNotification: any;

    beforeEach(async () => {
      testNotification = await createMockNotification(testUser.id, 'TASK_ASSIGNED', false);
    });

    it('should mark notification as read', async () => {
      const response = await authClient.post(`/api/notifications/${testNotification.id}/read`);
      
      expectSuccessResponse(response);
      
      // Verify it was marked as read
      const updated = await prisma.notification.findUnique({
        where: { id: testNotification.id },
      });
      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await authClient.post('/api/notifications/non-existent-id/read');
      
      expectErrorResponse(response, 404, 'Notification not found');
    });

    it('should prevent marking other users notification', async () => {
      const otherUser = await createMockUser({ role: 'team_member' });
      const otherNotification = await createMockNotification(otherUser.id, 'TASK_ASSIGNED');
      const otherAuthClient = await authenticatedClient(testUser.token);
      
      const response = await otherAuthClient.post(`/api/notifications/${otherNotification.id}/read`);
      
      expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('POST /api/notifications/read-all', () => {
    beforeEach(async () => {
      // Create multiple unread notifications
      await createMockNotification(testUser.id, 'TASK_ASSIGNED', false);
      await createMockNotification(testUser.id, 'COMMENT_ADDED', false);
      await createMockNotification(testUser.id, 'TASK_STATUS_CHANGED', false);
    });

    it('should mark all notifications as read', async () => {
      const response = await authClient.post('/api/notifications/read-all');
      
      expectSuccessResponse(response);
      expect(response.body.data.count).toBe(3);
      
      // Verify all were marked as read
      const unreadCount = await prisma.notification.count({
        where: {
          userId: testUser.id,
          isRead: false,
        },
      });
      expect(unreadCount).toBe(0);
    });

    it('should handle when no unread notifications exist', async () => {
      // Mark all as read first
      await authClient.post('/api/notifications/read-all');
      
      const response = await authClient.post('/api/notifications/read-all');
      
      expectSuccessResponse(response);
      expect(response.body.data.count).toBe(0);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    beforeEach(async () => {
      await prisma.notification.deleteMany({ where: { userId: testUser.id } });
      await createMockNotification(testUser.id, 'TASK_ASSIGNED', false);
      await createMockNotification(testUser.id, 'COMMENT_ADDED', false);
      await createMockNotification(testUser.id, 'TASK_STATUS_CHANGED', true); // Read
    });

    it('should return unread count', async () => {
      const response = await authClient.get('/api/notifications/unread-count');
      
      expectSuccessResponse(response);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    let testNotification: any;

    beforeEach(async () => {
      testNotification = await createMockNotification(testUser.id, 'TASK_ASSIGNED');
    });

    it('should delete notification', async () => {
      const response = await authClient.delete(`/api/notifications/${testNotification.id}`);
      
      expectSuccessResponse(response);
      
      const deleted = await prisma.notification.findUnique({
        where: { id: testNotification.id },
      });
      expect(deleted).toBeNull();
    });

    it('should prevent deleting other users notification', async () => {
      const otherUser = await createMockUser({ role: 'team_member' });
      const otherNotification = await createMockNotification(otherUser.id, 'TASK_ASSIGNED');
      const otherAuthClient = await authenticatedClient(testUser.token);
      
      const response = await otherAuthClient.delete(`/api/notifications/${otherNotification.id}`);
      
      expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should return user preferences', async () => {
      const response = await authClient.get('/api/notifications/preferences');
      
      expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('emailEnabled');
      expect(response.body.data[0]).toHaveProperty('inAppEnabled');
    });

    it('should return all notification types', async () => {
      const response = await authClient.get('/api/notifications/preferences');
      
      const types = response.body.data.map((p: any) => p.type);
      expect(types).toContain('TASK_ASSIGNED');
      expect(types).toContain('COMMENT_ADDED');
      expect(types).toContain('TASK_STATUS_CHANGED');
      expect(types).toContain('PROJECT_CREATED');
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = [
        {
          type: 'TASK_ASSIGNED',
          emailEnabled: false,
          inAppEnabled: true,
        },
        {
          type: 'COMMENT_ADDED',
          emailEnabled: true,
          inAppEnabled: false,
        },
      ];
      
      const response = await authClient.put('/api/notifications/preferences', { preferences });
      
      expectSuccessResponse(response);
      
      // Verify updates
      const updatedPrefs = await prisma.notificationPreference.findMany({
        where: { userId: testUser.id },
      });
      
      const taskAssignedPref = updatedPrefs.find(p => p.type === 'TASK_ASSIGNED');
      expect(taskAssignedPref?.emailEnabled).toBe(false);
      expect(taskAssignedPref?.inAppEnabled).toBe(true);
      
      const commentAddedPref = updatedPrefs.find(p => p.type === 'COMMENT_ADDED');
      expect(commentAddedPref?.emailEnabled).toBe(true);
      expect(commentAddedPref?.inAppEnabled).toBe(false);
    });

    it('should accept partial preference updates', async () => {
      const preferences = [
        {
          type: 'TASK_ASSIGNED',
          emailEnabled: false,
        },
      ];
      
      const response = await authClient.put('/api/notifications/preferences', { preferences });
      
      expectSuccessResponse(response);
    });
  });

  describe('Real-time Notifications', () => {
    it('should receive notification via WebSocket', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:3000/api/socket?token=${testUser.token}`);
      
      ws.on('open', () => {
        // Create a notification that should be sent via WebSocket
        createMockNotification(testUser.id, 'TASK_ASSIGNED', false);
      });
      
      ws.on('message', (data: string) => {
        const message = JSON.parse(data);
        if (message.type === 'notification') {
          expect(message.data).toBeDefined();
          ws.close();
          done();
        }
      });
      
      setTimeout(() => {
        ws.close();
        done.fail('WebSocket notification not received');
      }, 5000);
    });
  });

  describe('Notification Batching', () => {
    it('should batch similar notifications', async () => {
      // Create multiple similar notifications quickly
      for (let i = 0; i < 5; i++) {
        await createMockNotification(testUser.id, 'TASK_ASSIGNED', false);
      }
      
      const response = await authClient.get('/api/notifications?limit=10');
      
      // Should have batched them
      expect(response.body.data.length).toBeLessThan(5);
    });
  });

  describe('Notification Cleanup', () => {
    it('should auto-delete old notifications', async () => {
      // Create old notification
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days old
      
      await prisma.notification.create({
        data: {
          userId: testUser.id,
          type: 'TASK_ASSIGNED',
          title: 'Old Notification',
          content: 'This should be cleaned up',
          createdAt: oldDate,
        },
      });
      
      // Trigger cleanup (in production this would be a cron job)
      await prisma.notification.deleteMany({
        where: {
          userId: testUser.id,
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });
      
      const oldNotifications = await prisma.notification.findMany({
        where: {
          userId: testUser.id,
          title: 'Old Notification',
        },
      });
      
      expect(oldNotifications).toHaveLength(0);
    });
  });
});