// tests/fixtures/database.helper.ts
import { PrismaClient } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';

export class DatabaseHelper {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  // Generate random test data
  generateRandomUser(overrides: Partial<any> = {}) {
    const timestamp = Date.now();
    return {
      id: overrides.id || `test-user-${timestamp}-${randomInt(1000)}`,
      email: overrides.email || `test-${timestamp}@example.com`,
      name: overrides.name || `Test User ${timestamp}`,
      passwordHash: overrides.passwordHash || '$2a$10$testHash',
      role: overrides.role || 'team_member',
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
  }
  
  generateRandomProject(overrides: Partial<any> = {}) {
    const timestamp = Date.now();
    return {
      id: overrides.id || `test-project-${timestamp}`,
      name: overrides.name || `Test Project ${timestamp}`,
      description: overrides.description || `Test project created at ${timestamp}`,
      status: overrides.status || 'active',
      deadline: overrides.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: overrides.createdBy || 'test-user-id',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
  }
  
  generateRandomTask(projectId: string, overrides: Partial<any> = {}) {
    const timestamp = Date.now();
    return {
      id: overrides.id || `test-task-${timestamp}`,
      title: overrides.title || `Test Task ${timestamp}`,
      description: overrides.description || `Test task description ${timestamp}`,
      projectId,
      assignedTo: overrides.assignedTo || null,
      createdBy: overrides.createdBy || 'test-user-id',
      dueDate: overrides.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: overrides.priority || 'medium',
      status: overrides.status || 'todo',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
  }
  
  // Bulk data generators
  generateBulkUsers(count: number): any[] {
    return Array(count).fill(null).map(() => this.generateRandomUser());
  }
  
  generateBulkProjects(count: number, createdBy: string): any[] {
    return Array(count).fill(null).map(() => this.generateRandomProject({ createdBy }));
  }
  
  generateBulkTasks(count: number, projectId: string, assigneeIds: string[]): any[] {
    return Array(count).fill(null).map(() => 
      this.generateRandomTask(projectId, {
        assignedTo: assigneeIds[randomInt(0, assigneeIds.length)],
        priority: ['high', 'medium', 'low'][randomInt(0, 3)],
        status: ['todo', 'in_progress', 'completed'][randomInt(0, 3)],
      })
    );
  }
  
  // Performance testing
  async measureQueryPerformance(query: () => Promise<any>, iterations: number = 10) {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await query();
      const end = performance.now();
      times.push(end - start);
    }
    
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
    
    return { average, min, max, p95, times };
  }
  
  // Data validation helpers
  async assertDatabaseState(table: string, expectedCount: number) {
    const count = await this.prisma[table].count();
    if (count !== expectedCount) {
      throw new Error(`Expected ${expectedCount} records in ${table}, but found ${count}`);
    }
    return true;
  }
  
  async assertUniqueConstraint(table: string, field: string, value: any) {
    try {
      await this.prisma[table].create({
        data: { [field]: value },
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }
  
  async assertForeignKeyConstraint(table: string, field: string, value: string) {
    try {
      await this.prisma[table].create({
        data: { [field]: value },
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2003') {
        return false;
      }
      throw error;
    }
  }
  
  // Query builders for testing
  buildComplexQuery(options: {
    select?: string[];
    where?: Record<string, any>;
    include?: Record<string, boolean>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    limit?: number;
    offset?: number;
  }) {
    const { select, where, include, orderBy, limit, offset } = options;
    
    return {
      select: select?.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
      where,
      include,
      orderBy,
      take: limit,
      skip: offset,
    };
  }
  
  // Transaction testing
  async testTransaction(operations: Array<() => Promise<any>>) {
    const results = [];
    
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const operation of operations) {
          const result = await operation();
          results.push(result);
        }
      });
      return { success: true, results };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // Data integrity checks
  async checkReferentialIntegrity() {
    const checks = {
      tasksWithoutProjects: await this.prisma.task.count({
        where: { project: null },
      }),
      commentsWithoutTasks: await this.prisma.taskComment.count({
        where: { task: null },
      }),
      membersWithoutUsers: await this.prisma.projectMember.count({
        where: { user: null },
      }),
    };
    
    return checks;
  }
  
  // Performance optimization validation
  async explainQuery(query: string) {
    const result = await this.prisma.$queryRawUnsafe(`EXPLAIN ANALYZE ${query}`);
    return result;
  }
  
  async getTableSize(tableName: string) {
    const result = await this.prisma.$queryRawUnsafe(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('"${tableName}"')) as total_size,
        pg_size_pretty(pg_relation_size('"${tableName}"')) as data_size,
        pg_size_pretty(pg_indexes_size('"${tableName}"')) as index_size
    `);
    return result;
  }
  
  // Index validation
  async getTableIndexes(tableName: string) {
    const result = await this.prisma.$queryRawUnsafe(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = '${tableName}'
    `);
    return result;
  }
  
  async validateIndexUsage(query: string, expectedIndex: string) {
    const explain = await this.prisma.$queryRawUnsafe(`EXPLAIN ${query}`);
    const explainStr = JSON.stringify(explain);
    return explainStr.includes(expectedIndex);
  }
}