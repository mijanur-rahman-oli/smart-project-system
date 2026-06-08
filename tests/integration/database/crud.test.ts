// tests/integration/database/crud.test.ts
import { DatabaseFixture } from '@/tests/fixtures/database.fixture';
import { DatabaseHelper } from '@/tests/fixtures/database.helper';
import { PrismaClient } from '@prisma/client';

describe('Database CRUD Operations', () => {
  let fixture: DatabaseFixture;
  let helper: DatabaseHelper;
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    fixture = new DatabaseFixture();
    await fixture.setup();
    helper = new DatabaseHelper();
    prisma = new PrismaClient();
  });
  
  afterAll(async () => {
    await fixture.teardown();
    await prisma.$disconnect();
  });
  
  describe('User CRUD', () => {
    it('should create a user', async () => {
      const userData = helper.generateRandomUser();
      const user = await prisma.user.create({ data: userData });
      
      expect(user.id).toBe(userData.id);
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
    });
    
    it('should read a user by ID', async () => {
      const userData = helper.generateRandomUser();
      await prisma.user.create({ data: userData });
      
      const user = await prisma.user.findUnique({
        where: { id: userData.id },
      });
      
      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
    });
    
    it('should update a user', async () => {
      const userData = helper.generateRandomUser();
      await prisma.user.create({ data: userData });
      
      const updated = await prisma.user.update({
        where: { id: userData.id },
        data: { name: 'Updated Name' },
      });
      
      expect(updated.name).toBe('Updated Name');
    });
    
    it('should delete a user', async () => {
      const userData = helper.generateRandomUser();
      await prisma.user.create({ data: userData });
      
      await prisma.user.delete({ where: { id: userData.id } });
      const user = await prisma.user.findUnique({
        where: { id: userData.id },
      });
      
      expect(user).toBeNull();
    });
    
    it('should enforce unique email constraint', async () => {
      const email = `unique-${Date.now()}@test.com`;
      const user1 = helper.generateRandomUser({ email });
      const user2 = helper.generateRandomUser({ email });
      
      await prisma.user.create({ data: user1 });
      
      await expect(prisma.user.create({ data: user2 })).rejects.toThrow();
    });
  });
  
  describe('Project CRUD', () => {
    let userId: string;
    
    beforeEach(async () => {
      const user = helper.generateRandomUser();
      const created = await prisma.user.create({ data: user });
      userId = created.id;
    });
    
    it('should create a project', async () => {
      const projectData = helper.generateRandomProject({ createdBy: userId });
      const project = await prisma.project.create({ data: projectData });
      
      expect(project.id).toBe(projectData.id);
      expect(project.name).toBe(projectData.name);
      expect(project.createdBy).toBe(userId);
    });
    
    it('should read project with relations', async () => {
      const projectData = helper.generateRandomProject({ createdBy: userId });
      await prisma.project.create({ data: projectData });
      
      const project = await prisma.project.findUnique({
        where: { id: projectData.id },
        include: { creator: true, tasks: true, members: true },
      });
      
      expect(project).toBeDefined();
      expect(project?.creator.id).toBe(userId);
    });
    
    it('should update project status', async () => {
      const projectData = helper.generateRandomProject({ createdBy: userId });
      await prisma.project.create({ data: projectData });
      
      const updated = await prisma.project.update({
        where: { id: projectData.id },
        data: { status: 'completed' },
      });
      
      expect(updated.status).toBe('completed');
    });
    
    it('should cascade delete projects', async () => {
      const projectData = helper.generateRandomProject({ createdBy: userId });
      await prisma.project.create({ data: projectData });
      
      // Create task
      await prisma.task.create({
        data: helper.generateRandomTask(projectData.id),
      });
      
      await prisma.project.delete({ where: { id: projectData.id } });
      
      const project = await prisma.project.findUnique({
        where: { id: projectData.id },
      });
      expect(project).toBeNull();
      
      const tasks = await prisma.task.findMany({
        where: { projectId: projectData.id },
      });
      expect(tasks).toHaveLength(0);
    });
  });
  
  describe('Task CRUD', () => {
    let projectId: string;
    let userId: string;
    
    beforeEach(async () => {
      const user = helper.generateRandomUser();
      const createdUser = await prisma.user.create({ data: user });
      userId = createdUser.id;
      
      const project = helper.generateRandomProject({ createdBy: userId });
      const createdProject = await prisma.project.create({ data: project });
      projectId = createdProject.id;
    });
    
    it('should create a task', async () => {
      const taskData = helper.generateRandomTask(projectId);
      const task = await prisma.task.create({ data: taskData });
      
      expect(task.id).toBe(taskData.id);
      expect(task.title).toBe(taskData.title);
      expect(task.projectId).toBe(projectId);
    });
    
    it('should enforce unique task title per project', async () => {
      const title = `Unique Task ${Date.now()}`;
      const task1 = helper.generateRandomTask(projectId, { title });
      const task2 = helper.generateRandomTask(projectId, { title });
      
      await prisma.task.create({ data: task1 });
      await expect(prisma.task.create({ data: task2 })).rejects.toThrow();
    });
    
    it('should update task status', async () => {
      const taskData = helper.generateRandomTask(projectId, { status: 'todo' });
      const task = await prisma.task.create({ data: taskData });
      
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: { status: 'in_progress' },
      });
      
      expect(updated.status).toBe('in_progress');
    });
    
    it('should set completedAt when task is completed', async () => {
      const taskData = helper.generateRandomTask(projectId, { status: 'todo' });
      const task = await prisma.task.create({ data: taskData });
      
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: { 
          status: 'completed',
          completedAt: new Date(),
        },
      });
      
      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
    });
  });
  
  describe('Relationships', () => {
    it('should properly handle project-member relationships', async () => {
      const user = helper.generateRandomUser();
      const createdUser = await prisma.user.create({ data: user });
      
      const project = helper.generateRandomProject({ createdBy: createdUser.id });
      const createdProject = await prisma.project.create({ data: project });
      
      await prisma.projectMember.create({
        data: {
          projectId: createdProject.id,
          userId: createdUser.id,
        },
      });
      
      const projectWithMembers = await prisma.project.findUnique({
        where: { id: createdProject.id },
        include: { members: true },
      });
      
      expect(projectWithMembers?.members).toHaveLength(1);
      expect(projectWithMembers?.members[0].userId).toBe(createdUser.id);
    });
    
    it('should prevent duplicate project members', async () => {
      const user = helper.generateRandomUser();
      const createdUser = await prisma.user.create({ data: user });
      
      const project = helper.generateRandomProject({ createdBy: createdUser.id });
      const createdProject = await prisma.project.create({ data: project });
      
      await prisma.projectMember.create({
        data: {
          projectId: createdProject.id,
          userId: createdUser.id,
        },
      });
      
      await expect(
        prisma.projectMember.create({
          data: {
            projectId: createdProject.id,
            userId: createdUser.id,
          },
        })
      ).rejects.toThrow();
    });
  });
});