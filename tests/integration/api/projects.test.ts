// tests/integration/api/projects.test.ts
import { createTestClient, authenticatedClient, expectSuccessResponse, expectErrorResponse, expectPaginatedResponse } from '@/tests/utils/test-client';
import { createMockUser, createMockProject, cleanupTestData } from '@/tests/utils/test-data';

describe('Projects API Integration', () => {
  let client: any;
  let adminUser: any;
  let managerUser: any;
  let memberUser: any;
  
  beforeAll(async () => {
    client = createTestClient();
    adminUser = await createMockUser({ role: 'admin' });
    managerUser = await createMockUser({ role: 'project_manager' });
    memberUser = await createMockUser({ role: 'team_member' });
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe('GET /api/projects', () => {
    it('should return projects for authenticated user', async () => {
      const authClient = await authenticatedClient(adminUser.token);
      const response = await authClient.get('/api/projects');
      
      expectSuccessResponse(response);
      expectPaginatedResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should filter projects by status', async () => {
      await createMockProject({ createdBy: adminUser.id, status: 'active' });
      await createMockProject({ createdBy: adminUser.id, status: 'completed' });
      
      const authClient = await authenticatedClient(adminUser.token);
      const response = await authClient.get('/api/projects?status=active');
      
      expectSuccessResponse(response);
      expect(response.body.data.every((p: any) => p.status === 'active')).toBe(true);
    });
    
    it('should search projects by name', async () => {
      await createMockProject({ createdBy: adminUser.id, name: 'Unique Searchable Project' });
      
      const authClient = await authenticatedClient(adminUser.token);
      const response = await authClient.get('/api/projects?search=Unique');
      
      expectSuccessResponse(response);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain('Unique');
    });
    
    it('should return 401 for unauthenticated request', async () => {
      const response = await client.get('/api/projects');
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/projects', () => {
    it('should allow admin to create project', async () => {
      const authClient = await authenticatedClient(adminUser.token);
      const response = await authClient.post('/api/projects', {
        name: 'Admin Created Project',
        description: 'Test description',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'active',
      });
      
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe('Admin Created Project');
      expect(response.status).toBe(201);
    });
    
    it('should allow project manager to create project', async () => {
      const authClient = await authenticatedClient(managerUser.token);
      const response = await authClient.post('/api/projects', {
        name: 'Manager Created Project',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe('Manager Created Project');
    });
    
    it('should prevent team member from creating project', async () => {
      const authClient = await authenticatedClient(memberUser.token);
      const response = await authClient.post('/api/projects', {
        name: 'Member Project',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      
      expectErrorResponse(response, 403, 'Insufficient permissions');
    });
    
    it('should reject duplicate project names', async () => {
      const authClient = await authenticatedClient(adminUser.token);
      
      await authClient.post('/api/projects', {
        name: 'Duplicate Project',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      
      const response = await authClient.post('/api/projects', {
        name: 'Duplicate Project',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      
      expectErrorResponse(response, 409, 'already exists');
    });
  });
  
  describe('GET /api/projects/:id', () => {
    it('should return project details for authorized user', async () => {
      const project = await createMockProject({ createdBy: adminUser.id });
      const authClient = await authenticatedClient(adminUser.token);
      const response = await authClient.get(`/api/projects/${project.id}`);
      
      expectSuccessResponse(response);
      expect(response.body.data.id).toBe(project.id);
      expect(response.body.data.name).toBe(project.name);
    });
    
    it('should return 404 for non-existent project', async () => {
      const authClient = await authenticatedClient(adminUser.token);
      const response = await authClient.get('/api/projects/non-existent-id');
      
      expectErrorResponse(response, 404, 'Project not found');
    });
    
    it('should prevent access to unauthorized project', async () => {
      const project = await createMockProject({ createdBy: 'other-user' });
      const authClient = await authenticatedClient(memberUser.token);
      const response = await authClient.get(`/api/projects/${project.id}`);
      
      expectErrorResponse(response, 403, 'Access denied');
    });
  });
  
  describe('PUT /api/projects/:id', () => {
    it('should allow project creator to update project', async () => {
      const project = await createMockProject({ createdBy: managerUser.id });
      const authClient = await authenticatedClient(managerUser.token);
      const response = await authClient.put(`/api/projects/${project.id}`, {
        name: 'Updated Project Name',
      });
      
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe('Updated Project Name');
    });
    
    it('should prevent non-creator from updating project', async () => {
      const project = await createMockProject({ createdBy: adminUser.id });
      const authClient = await authenticatedClient(memberUser.token);
      const response = await authClient.put(`/api/projects/${project.id}`, {
        name: 'Hacked Name',
      });
      
      expectErrorResponse(response, 403, 'Insufficient permissions');
    });
  });
  
  describe('DELETE /api/projects/:id', () => {
    it('should allow admin to delete any project', async () => {
      const project = await createMockProject({ createdBy: memberUser.id });
      const authClient = await authenticatedClient(adminUser.token);
      const response = await authClient.delete(`/api/projects/${project.id}`);
      
      expectSuccessResponse(response);
    });
    
    it('should allow creator to delete own project', async () => {
      const project = await createMockProject({ createdBy: managerUser.id });
      const authClient = await authenticatedClient(managerUser.token);
      const response = await authClient.delete(`/api/projects/${project.id}`);
      
      expectSuccessResponse(response);
    });
    
    it('should prevent member from deleting project', async () => {
      const project = await createMockProject({ createdBy: adminUser.id });
      const authClient = await authenticatedClient(memberUser.token);
      const response = await authClient.delete(`/api/projects/${project.id}`);
      
      expectErrorResponse(response, 403, 'Insufficient permissions');
    });
  });
});