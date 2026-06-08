// tests/integration/database/transactions.test.ts
import { DatabaseFixture } from '@/tests/fixtures/database.fixture';
import { DatabaseHelper } from '@/tests/fixtures/database.helper';
import { PrismaClient } from '@prisma/client';

describe('Database Transactions', () => {
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
  
  describe('ACID Properties', () => {
    it('should maintain atomicity - all operations succeed', async () => {
      const userData = helper.generateRandomUser();
      const projectData = helper.generateRandomProject({ createdBy: userData.id });
      
      const result = await helper.testTransaction([
        () => prisma.user.create({ data: userData }),
        () => prisma.project.create({ data: projectData }),
      ]);
      
      expect(result.success).toBe(true);
      
      const user = await prisma.user.findUnique({ where: { id: userData.id } });
      const project = await prisma.project.findUnique({ where: { id: projectData.id } });
      
      expect(user).toBeDefined();
      expect(project).toBeDefined();
    });
    
    it('should rollback on failure', async () => {
      const userData = helper.generateRandomUser();
      const invalidProjectData = { ...helper.generateRandomProject(), name: null };
      
      const result = await helper.testTransaction([
        () => prisma.user.create({ data: userData }),
        () => prisma.project.create({ data: invalidProjectData }),
      ]);
      
      expect(result.success).toBe(false);
      
      const user = await prisma.user.findUnique({ where: { id: userData.id } });
      expect(user).toBeNull(); // Should be rolled back
    });
    
    it('should maintain consistency with constraints', async () => {
      const userData = helper.generateRandomUser();
      await prisma.user.create({ data: userData });
      
      const projectData = helper.generateRandomProject({ createdBy: 'non-existent-user' });
      
      const result = await helper.testTransaction([
        () => prisma.project.create({ data: projectData }),
      ]);
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('Concurrent Transactions', () => {
    it('should handle concurrent project creation', async () => {
      const userId = 'test-user-concurrent';
      await prisma.user.create({
        data: helper.generateRandomUser({ id: userId }),
      });
      
      const createProject = (index: number) => {
        return prisma.project.create({
          data: helper.generateRandomProject({
            createdBy: userId,
            name: `Concurrent Project ${index}`,
          }),
        });
      };
      
      const promises = Array(5).fill(null).map((_, i) => createProject(i));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(results[0].name).toContain('Concurrent Project');
    });
    
    it('should handle concurrent task assignments', async () => {
      const taskId = 'test-task-concurrent';
      const userIds = Array(3).fill(null).map(() => helper.generateRandomUser().id);
      
      for (const userId of userIds) {
        await prisma.user.create({
          data: helper.generateRandomUser({ id: userId }),
        });
      }
      
      const task = await prisma.task.create({
        data: helper.generateRandomTask('test-project-1', { id: taskId }),
      });
      
      const assignTask = (userId: string) => {
        return prisma.task.update({
          where: { id: task.id },
          data: { assignedTo: userId },
        });
      };
      
      // Concurrent updates to same task
      const promises = userIds.map(userId => assignTask(userId));
      const results = await Promise.all(promises);
      
      // Last write wins
      expect(results[results.length - 1].assignedTo).toBe(userIds[userIds.length - 1]);
    });
  });
  
  describe('Isolation Levels', () => {
    it('should prevent dirty reads', async () => {
      const userData = helper.generateRandomUser();
      
      const transaction1 = prisma.$transaction(async (tx) => {
        await tx.user.create({ data: userData });
        
        // Transaction 2 should not see uncommitted data
        const userInTransaction2 = await prisma.user.findUnique({
          where: { id: userData.id },
        });
        
        expect(userInTransaction2).toBeNull();
        
        return true;
      });
      
      await transaction1;
    });
    
    it('should handle phantom reads', async () => {
      const userId = 'test-user-phantom';
      await prisma.user.create({
        data: helper.generateRandomUser({ id: userId }),
      });
      
      const projectIds: string[] = [];
      
      const transaction1 = prisma.$transaction(async (tx) => {
        const projects = await tx.project.findMany({
          where: { createdBy: userId },
        });
        
        // Another transaction creates a project
        const newProject = await prisma.project.create({
          data: helper.generateRandomProject({ createdBy: userId }),
        });
        projectIds.push(newProject.id);
        
        // First transaction shouldn't see the new project
        const projectsAgain = await tx.project.findMany({
          where: { createdBy: userId },
        });
        
        expect(projectsAgain).toHaveLength(projects.length);
        
        return true;
      });
      
      await transaction1;
      
      // Verify the project was actually created
      const project = await prisma.project.findUnique({
        where: { id: projectIds[0] },
      });
      expect(project).toBeDefined();
    });
  });
});