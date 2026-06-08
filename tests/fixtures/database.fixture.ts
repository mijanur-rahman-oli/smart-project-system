// tests/fixtures/database.fixture.ts
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export class DatabaseFixture {
  private prisma: PrismaClient;
  private testDatabaseUrl: string;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';
  }
  
  async setup() {
    // Create test database if not exists
    await this.createTestDatabase();
    
    // Run migrations on test database
    await this.runMigrations();
    
    // Seed test data
    await this.seedTestData();
  }
  
  async teardown() {
    // Clean up test data
    await this.cleanupTestData();
    
    // Disconnect Prisma
    await this.prisma.$disconnect();
    
    // Drop test database
    await this.dropTestDatabase();
  }
  
  private async createTestDatabase() {
    const databaseName = this.getDatabaseName();
    try {
      await execAsync(`createdb ${databaseName} -U postgres`);
    } catch (error) {
      // Database might already exist
      console.log('Test database already exists or creation failed');
    }
  }
  
  private async dropTestDatabase() {
    const databaseName = this.getDatabaseName();
    try {
      await execAsync(`dropdb ${databaseName} -U postgres`);
    } catch (error) {
      console.log('Failed to drop test database');
    }
  }
  
  private async runMigrations() {
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: this.testDatabaseUrl },
    });
  }
  
  private async seedTestData() {
    // Seed minimal test data
    await this.seedUsers();
    await this.seedProjects();
    await this.seedTasks();
    await this.seedComments();
    await this.seedNotifications();
  }
  
  private getDatabaseName(): string {
    const url = new URL(this.testDatabaseUrl);
    return url.pathname.slice(1);
  }
  
  private async seedUsers() {
    const users = [
      {
        id: 'test-admin-1',
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'admin',
        passwordHash: await this.hashPassword('Admin123!'),
        isActive: true,
      },
      {
        id: 'test-manager-1',
        email: 'manager@test.com',
        name: 'Test Manager',
        role: 'project_manager',
        passwordHash: await this.hashPassword('Manager123!'),
        isActive: true,
      },
      {
        id: 'test-member-1',
        email: 'member@test.com',
        name: 'Test Member',
        role: 'team_member',
        passwordHash: await this.hashPassword('Member123!'),
        isActive: true,
      },
      {
        id: 'test-member-2',
        email: 'member2@test.com',
        name: 'Test Member 2',
        role: 'team_member',
        passwordHash: await this.hashPassword('Member123!'),
        isActive: true,
      },
    ];
    
    for (const user of users) {
      await this.prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: user,
      });
    }
  }
  
  private async seedProjects() {
    const projects = [
      {
        id: 'test-project-1',
        name: 'Test Project Alpha',
        description: 'First test project for integration testing',
        status: 'active',
        deadline: new Date('2024-12-31'),
        createdBy: 'test-admin-1',
      },
      {
        id: 'test-project-2',
        name: 'Test Project Beta',
        description: 'Second test project for integration testing',
        status: 'active',
        deadline: new Date('2024-12-31'),
        createdBy: 'test-manager-1',
      },
      {
        id: 'test-project-3',
        name: 'Test Project Gamma',
        description: 'Completed test project',
        status: 'completed',
        deadline: new Date('2024-01-01'),
        createdBy: 'test-admin-1',
      },
    ];
    
    for (const project of projects) {
      await this.prisma.project.upsert({
        where: { id: project.id },
        update: {},
        create: project,
      });
    }
    
    // Add project members
    await this.prisma.projectMember.createMany({
      data: [
        { projectId: 'test-project-1', userId: 'test-admin-1' },
        { projectId: 'test-project-1', userId: 'test-manager-1' },
        { projectId: 'test-project-1', userId: 'test-member-1' },
        { projectId: 'test-project-2', userId: 'test-manager-1' },
        { projectId: 'test-project-2', userId: 'test-member-1' },
        { projectId: 'test-project-2', userId: 'test-member-2' },
      ],
    });
  }
  
  private async seedTasks() {
    const tasks = [
      {
        id: 'test-task-1',
        title: 'Implement authentication',
        description: 'Add JWT authentication and session management',
        projectId: 'test-project-1',
        assignedTo: 'test-member-1',
        createdBy: 'test-admin-1',
        dueDate: new Date('2024-06-15'),
        priority: 'high',
        status: 'in_progress',
      },
      {
        id: 'test-task-2',
        title: 'Design database schema',
        description: 'Create normalized PostgreSQL schema',
        projectId: 'test-project-1',
        assignedTo: 'test-manager-1',
        createdBy: 'test-admin-1',
        dueDate: new Date('2024-06-10'),
        priority: 'high',
        status: 'completed',
        completedAt: new Date('2024-06-05'),
      },
      {
        id: 'test-task-3',
        title: 'Build UI components',
        description: 'Create reusable React components',
        projectId: 'test-project-2',
        assignedTo: 'test-member-1',
        createdBy: 'test-manager-1',
        dueDate: new Date('2024-07-20'),
        priority: 'medium',
        status: 'todo',
      },
      {
        id: 'test-task-4',
        title: 'Write unit tests',
        description: 'Achieve 80% test coverage',
        projectId: 'test-project-2',
        assignedTo: 'test-member-2',
        createdBy: 'test-manager-1',
        dueDate: new Date('2024-06-25'),
        priority: 'medium',
        status: 'todo',
      },
    ];
    
    for (const task of tasks) {
      await this.prisma.task.upsert({
        where: { id: task.id },
        update: {},
        create: task,
      });
    }
  }
  
  private async seedComments() {
    const comments = [
      {
        id: 'test-comment-1',
        taskId: 'test-task-1',
        userId: 'test-member-1',
        content: 'Working on authentication flow. Will have a PR ready by tomorrow.',
      },
      {
        id: 'test-comment-2',
        taskId: 'test-task-1',
        userId: 'test-admin-1',
        content: 'Great! Make sure to include refresh token rotation.',
      },
      {
        id: 'test-comment-3',
        taskId: 'test-task-3',
        userId: 'test-member-1',
        content: 'Started working on the button component. Should we use shadcn/ui?',
      },
    ];
    
    for (const comment of comments) {
      await this.prisma.taskComment.upsert({
        where: { id: comment.id },
        update: {},
        create: comment,
      });
    }
  }
  
  private async seedNotifications() {
    const notifications = [
      {
        id: 'test-notif-1',
        userId: 'test-member-1',
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        content: 'You have been assigned to "Implement authentication"',
        isRead: false,
      },
      {
        id: 'test-notif-2',
        userId: 'test-member-1',
        type: 'COMMENT_ADDED',
        title: 'New Comment',
        content: 'Admin commented on your task',
        isRead: true,
      },
    ];
    
    for (const notification of notifications) {
      await this.prisma.notification.upsert({
        where: { id: notification.id },
        update: {},
        create: notification,
      });
    }
  }
  
  private async cleanupTestData() {
    const tables = [
      'task_attachments',
      'task_comments',
      'notifications',
      'activity_logs',
      'tasks',
      'project_members',
      'projects',
      'users',
    ];
    
    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
  
  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 10);
  }
  
  // Helper methods for tests
  async getTestUser(role?: string) {
    if (role === 'admin') {
      return this.prisma.user.findUnique({ where: { id: 'test-admin-1' } });
    }
    if (role === 'project_manager') {
      return this.prisma.user.findUnique({ where: { id: 'test-manager-1' } });
    }
    return this.prisma.user.findUnique({ where: { id: 'test-member-1' } });
  }
  
  async getTestProject(name?: string) {
    if (name === 'alpha') {
      return this.prisma.project.findUnique({ where: { id: 'test-project-1' } });
    }
    if (name === 'beta') {
      return this.prisma.project.findUnique({ where: { id: 'test-project-2' } });
    }
    return this.prisma.project.findUnique({ where: { id: 'test-project-1' } });
  }
  
  async getTestTask(title?: string) {
    if (title === 'auth') {
      return this.prisma.task.findUnique({ where: { id: 'test-task-1' } });
    }
    return this.prisma.task.findUnique({ where: { id: 'test-task-1' } });
  }
  
  async clearTable(tableName: string) {
    await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
  }
  
  async executeRawQuery(query: string) {
    return this.prisma.$executeRawUnsafe(query);
  }
  
  async beginTransaction() {
    return this.prisma.$transaction;
  }
}