// tests/utils/test-data.ts
import { faker } from '@faker-js/faker';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth/jwt';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'project_manager' | 'team_member';
  token: string;
}

export interface MockProject {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'on_hold';
  deadline: Date;
  createdBy: string;
}

export interface MockTask {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  projectId: string;
  assignedTo: string | null;
}

// Generate mock user
export async function createMockUser(overrides?: Partial<MockUser>): Promise<MockUser> {
  const email = overrides?.email || faker.internet.email();
  const passwordHash = await bcrypt.hash('Test123!', 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      name: overrides?.name || faker.person.fullName(),
      passwordHash,
      role: overrides?.role || 'team_member',
      isActive: true,
    },
  });
  
  const token = await signJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any,
    token,
  };
}

// Generate mock project
export async function createMockProject(overrides?: Partial<MockProject>): Promise<MockProject> {
  const project = await prisma.project.create({
    data: {
      name: overrides?.name || faker.company.name(),
      description: overrides?.description || faker.company.catchPhrase(),
      status: overrides?.status || 'active',
      deadline: overrides?.deadline || faker.date.future(),
      createdBy: overrides?.createdBy || 'mock-user-id',
    },
  });
  
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status as any,
    deadline: project.deadline,
    createdBy: project.createdBy,
  };
}

// Generate mock task
export async function createMockTask(overrides?: Partial<MockTask>): Promise<MockTask> {
  const task = await prisma.task.create({
    data: {
      title: overrides?.title || faker.lorem.sentence(),
      description: overrides?.description || faker.lorem.paragraph(),
      status: overrides?.status || 'todo',
      priority: overrides?.priority || 'medium',
      dueDate: overrides?.dueDate || faker.date.future(),
      projectId: overrides?.projectId || 'mock-project-id',
      assignedTo: overrides?.assignedTo || null,
      createdBy: 'mock-user-id',
    },
  });
  
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as any,
    priority: task.priority as any,
    dueDate: task.dueDate,
    projectId: task.projectId,
    assignedTo: task.assignedTo,
  };
}

// Generate mock comment
export async function createMockComment(taskId: string, userId: string) {
  return prisma.taskComment.create({
    data: {
      taskId,
      userId,
      content: faker.lorem.paragraph(),
    },
  });
}

// Generate mock notification
export async function createMockNotification(userId: string, type: string = 'TASK_ASSIGNED') {
  return prisma.notification.create({
    data: {
      userId,
      type: type as any,
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraph(),
      metadata: {},
    },
  });
}

// Clean up all test data
export async function cleanupTestData() {
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: { contains: '@test.com' },
    },
  });
}

// Generate bulk test data
export async function generateBulkTestData(count: number = 10) {
  const users = await Promise.all(
    Array(count).fill(null).map(() => createMockUser())
  );
  
  const projects = await Promise.all(
    Array(count).fill(null).map(() => createMockProject({ createdBy: users[0].id }))
  );
  
  const tasks = [];
  for (const project of projects) {
    const projectTasks = await Promise.all(
      Array(count).fill(null).map(() => createMockTask({
        projectId: project.id,
        assignedTo: users[Math.floor(Math.random() * users.length)].id,
      }))
    );
    tasks.push(...projectTasks);
  }
  
  return { users, projects, tasks };
}

// Faker setup
faker.seed(123);