// tests/fixtures/test-data.ts
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
  passwordHash: string;
  isActive: boolean;
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
  createdBy: string;
}

export interface MockComment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  metadata?: any;
}

// User fixtures
export async function createMockUser(overrides?: Partial<MockUser>): Promise<MockUser> {
  const timestamp = Date.now();
  const email = overrides?.email || `test-${timestamp}@example.com`;
  const password = overrides?.passwordHash || 'Test123!@#';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      id: overrides?.id || `user-${timestamp}`,
      email,
      name: overrides?.name || faker.person.fullName(),
      passwordHash,
      role: overrides?.role || 'team_member',
      isActive: overrides?.isActive ?? true,
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
    passwordHash: user.passwordHash,
    isActive: user.isActive,
  };
}

export async function createMockUsers(count: number, role?: string): Promise<MockUser[]> {
  const users: MockUser[] = [];
  for (let i = 0; i < count; i++) {
    const user = await createMockUser({ role: role as any });
    users.push(user);
  }
  return users;
}

// Project fixtures
export async function createMockProject(overrides?: Partial<MockProject>): Promise<MockProject> {
  const timestamp = Date.now();
  const project = await prisma.project.create({
    data: {
      id: overrides?.id || `project-${timestamp}`,
      name: overrides?.name || faker.company.name(),
      description: overrides?.description || faker.company.catchPhrase(),
      status: overrides?.status || 'active',
      deadline: overrides?.deadline || faker.date.future(),
      createdBy: overrides?.createdBy || 'user-default',
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

export async function createMockProjects(count: number, createdBy: string): Promise<MockProject[]> {
  const projects: MockProject[] = [];
  for (let i = 0; i < count; i++) {
    const project = await createMockProject({ createdBy });
    projects.push(project);
  }
  return projects;
}

// Task fixtures
export async function createMockTask(overrides?: Partial<MockTask>): Promise<MockTask> {
  const timestamp = Date.now();
  const task = await prisma.task.create({
    data: {
      id: overrides?.id || `task-${timestamp}`,
      title: overrides?.title || faker.lorem.sentence(),
      description: overrides?.description || faker.lorem.paragraph(),
      status: overrides?.status || 'todo',
      priority: overrides?.priority || 'medium',
      dueDate: overrides?.dueDate || faker.date.future(),
      projectId: overrides?.projectId || 'project-default',
      assignedTo: overrides?.assignedTo || null,
      createdBy: overrides?.createdBy || 'user-default',
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
    createdBy: task.createdBy,
  };
}

export async function createMockTasks(count: number, projectId: string, assigneeIds: string[]): Promise<MockTask[]> {
  const tasks: MockTask[] = [];
  for (let i = 0; i < count; i++) {
    const task = await createMockTask({
      projectId,
      assignedTo: assigneeIds[Math.floor(Math.random() * assigneeIds.length)],
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
      status: ['todo', 'in_progress', 'completed'][Math.floor(Math.random() * 3)] as any,
    });
    tasks.push(task);
  }
  return tasks;
}

// Comment fixtures
export async function createMockComment(taskId: string, userId: string, overrides?: Partial<MockComment>): Promise<MockComment> {
  const comment = await prisma.taskComment.create({
    data: {
      id: overrides?.id || `comment-${Date.now()}`,
      content: overrides?.content || faker.lorem.paragraph(),
      taskId,
      userId,
    },
  });
  
  return {
    id: comment.id,
    content: comment.content,
    taskId: comment.taskId,
    userId: comment.userId,
  };
}

// Notification fixtures
export async function createMockNotification(
  userId: string, 
  type: string = 'TASK_ASSIGNED', 
  isRead: boolean = false,
  overrides?: Partial<MockNotification>
): Promise<MockNotification> {
  const notification = await prisma.notification.create({
    data: {
      id: overrides?.id || `notif-${Date.now()}-${Math.random()}`,
      userId,
      type: type as any,
      title: overrides?.title || getNotificationTitle(type),
      content: overrides?.content || getNotificationContent(type),
      isRead,
      metadata: overrides?.metadata || {},
    },
  });
  
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    isRead: notification.isRead,
    metadata: notification.metadata,
  };
}

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    TASK_ASSIGNED: 'New Task Assigned',
    TASK_UPDATED: 'Task Updated',
    TASK_STATUS_CHANGED: 'Task Status Changed',
    COMMENT_ADDED: 'New Comment',
    PROJECT_CREATED: 'Project Created',
    MEMBER_ADDED: 'Member Added',
    DEADLINE_APPROACHING: 'Deadline Approaching',
  };
  return titles[type] || 'Notification';
}

function getNotificationContent(type: string): string {
  const contents: Record<string, string> = {
    TASK_ASSIGNED: 'You have been assigned a new task',
    TASK_UPDATED: 'A task you follow has been updated',
    TASK_STATUS_CHANGED: 'Task status has been changed',
    COMMENT_ADDED: 'Someone commented on your task',
    PROJECT_CREATED: 'A new project has been created',
    MEMBER_ADDED: 'A new member joined your project',
    DEADLINE_APPROACHING: 'A task deadline is approaching',
  };
  return contents[type] || 'You have a new notification';
}

// Bulk data generators
export async function generateCompleteTestDataset() {
  // Create users
  const admin = await createMockUser({ role: 'admin', email: 'admin@test.com' });
  const managers = await createMockUsers(3, 'project_manager');
  const members = await createMockUsers(10, 'team_member');
  
  const allUsers = [admin, ...managers, ...members];
  
  // Create projects
  const projects: MockProject[] = [];
  for (const manager of managers) {
    const managerProjects = await createMockProjects(2, manager.id);
    projects.push(...managerProjects);
  }
  
  // Add members to projects
  for (const project of projects) {
    const randomMembers = faker.helpers.arrayElements(allUsers, faker.number.int({ min: 2, max: 5 }));
    for (const member of randomMembers) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: member.id,
          },
        },
        update: {},
        create: {
          projectId: project.id,
          userId: member.id,
        },
      });
    }
  }
  
  // Create tasks
  const tasks: MockTask[] = [];
  for (const project of projects) {
    const assignees = allUsers.map(u => u.id);
    const projectTasks = await createMockTasks(10, project.id, assignees);
    tasks.push(...projectTasks);
  }
  
  // Create comments
  const comments: MockComment[] = [];
  for (const task of tasks.slice(0, 20)) {
    const commentCount = faker.number.int({ min: 0, max: 5 });
    for (let i = 0; i < commentCount; i++) {
      const randomUser = faker.helpers.arrayElement(allUsers);
      const comment = await createMockComment(task.id, randomUser.id);
      comments.push(comment);
    }
  }
  
  // Create notifications
  const notifications: MockNotification[] = [];
  for (const user of allUsers) {
    const notifCount = faker.number.int({ min: 0, max: 10 });
    const types = ['TASK_ASSIGNED', 'COMMENT_ADDED', 'TASK_STATUS_CHANGED', 'PROJECT_CREATED'];
    for (let i = 0; i < notifCount; i++) {
      const type = faker.helpers.arrayElement(types);
      const notification = await createMockNotification(user.id, type, faker.datatype.boolean());
      notifications.push(notification);
    }
  }
  
  return {
    users: allUsers,
    admin,
    managers,
    members,
    projects,
    tasks,
    comments,
    notifications,
  };
}

// Activity log fixtures
export async function createMockActivityLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any
) {
  return prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      metadata: metadata || {},
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    },
  });
}

// Cleanup function
export async function cleanupTestData() {
  const tables = [
    'task_attachments',
    'comment_attachments',
    'comment_reactions',
    'task_comments',
    'notifications',
    'activity_logs',
    'tasks',
    'project_members',
    'projects',
    'users',
  ];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      console.log(`Failed to truncate ${table}:`, error);
    }
  }
  
  // Reset sequences
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS "Notification_id_seq" RESTART WITH 1;`);
}

// Helper: Get random item from array
export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper: Generate random date between two dates
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper: Create paginated response
export function createPaginatedResponse<T>(data: T[], page: number, limit: number, total: number) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Export all fixtures
export default {
  createMockUser,
  createMockUsers,
  createMockProject,
  createMockProjects,
  createMockTask,
  createMockTasks,
  createMockComment,
  createMockNotification,
  generateCompleteTestDataset,
  cleanupTestData,
  getRandomItem,
  randomDate,
  createPaginatedResponse,
};