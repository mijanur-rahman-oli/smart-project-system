// tests/integration/database/performance.test.ts
import { DatabaseFixture } from '@/tests/fixtures/database.fixture';
import { DatabaseHelper } from '@/tests/fixtures/database.helper';
import { PrismaClient } from '@prisma/client';

describe('Database Performance Tests', () => {
  let fixture: DatabaseFixture;
  let helper: DatabaseHelper;
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    fixture = new DatabaseFixture();
    await fixture.setup();
    helper = new DatabaseHelper();
    prisma = new PrismaClient();
    
    // Seed large dataset for performance testing
    await seedLargeDataset();
  });
  
  afterAll(async () => {
    await fixture.teardown();
    await prisma.$disconnect();
  });
  
  async function seedLargeDataset() {
    // Create 100 users
    const users = helper.generateBulkUsers(100);
    for (const user of users) {
      await prisma.user.create({ data: user });
    }
    
    // Create 50 projects
    const projects = helper.generateBulkProjects(50, users[0].id);
    for (const project of projects) {
      await prisma.project.create({ data: project });
    }
    
    // Create 1000 tasks
    const tasks = helper.generateBulkTasks(1000, projects[0].id, users.map(u => u.id));
    for (const task of tasks) {
      await prisma.task.create({ data: task });
    }
  }
  
  describe('Query Performance', () => {
    it('should retrieve projects with tasks efficiently', async () => {
      const performance = await helper.measureQueryPerformance(async () => {
        return prisma.project.findMany({
          include: {
            tasks: true,
            members: true,
          },
          take: 10,
        });
      });
      
      expect(performance.average).toBeLessThan(100); // Less than 100ms average
      console.log('Query performance:', performance);
    });
    
    it('should handle complex joins efficiently', async () => {
      const performance = await helper.measureQueryPerformance(async () => {
        return prisma.task.findMany({
          where: {
            status: 'todo',
            priority: 'high',
          },
          include: {
            assignee: true,
            project: {
              include: {
                creator: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          take: 20,
        });
      });
      
      expect(performance.average).toBeLessThan(150);
    });
    
    it('should aggregate data efficiently', async () => {
      const performance = await helper.measureQueryPerformance(async () => {
        return prisma.task.groupBy({
          by: ['status', 'priority'],
          _count: true,
          _avg: { dueDate: true },
        });
      });
      
      expect(performance.average).toBeLessThan(200);
    });
  });
  
  describe('Index Usage', () => {
    it('should use index on task status', async () => {
      const usesIndex = await helper.validateIndexUsage(
        'SELECT * FROM tasks WHERE status = \'todo\'',
        'idx_tasks_status'
      );
      expect(usesIndex).toBe(true);
    });
    
    it('should use composite index on project_id and title', async () => {
      const usesIndex = await helper.validateIndexUsage(
        'SELECT * FROM tasks WHERE project_id = \'test-1\' AND title LIKE \'%test%\'',
        'idx_tasks_project_title'
      );
      expect(usesIndex).toBe(true);
    });
    
    it('should use index on due_date for sorting', async () => {
      const usesIndex = await helper.validateIndexUsage(
        'SELECT * FROM tasks ORDER BY due_date DESC LIMIT 10',
        'idx_tasks_due_date'
      );
      expect(usesIndex).toBe(true);
    });
  });
  
  describe('Table Sizes', () => {
    it('should have reasonable table sizes', async () => {
      const tasksSize = await helper.getTableSize('tasks');
      const usersSize = await helper.getTableSize('users');
      const projectsSize = await helper.getTableSize('projects');
      
      console.log('Table sizes:', { tasksSize, usersSize, projectsSize });
      
      // Verify sizes are within expected ranges
      expect(tasksSize).toBeDefined();
      expect(usersSize).toBeDefined();
      expect(projectsSize).toBeDefined();
    });
  });
  
  describe('Connection Pool', () => {
    it('should handle concurrent queries', async () => {
      const queries = Array(10).fill(null).map(() => 
        () => prisma.project.findMany({ take: 10 })
      );
      
      const start = performance.now();
      await Promise.all(queries.map(q => q()));
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // All queries should complete within 1 second
    });
  });
});