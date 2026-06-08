// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create demo users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      name: 'Project Manager',
      role: 'project_manager',
      isActive: true,
    },
  });
  console.log(`✅ Created manager user: ${manager.email}`);

  const member = await prisma.user.upsert({
    where: { email: 'member@demo.com' },
    update: {},
    create: {
      email: 'member@demo.com',
      passwordHash: await bcrypt.hash('Member123!', 12),
      name: 'Team Member',
      role: 'team_member',
      isActive: true,
    },
  });
  console.log(`✅ Created member user: ${member.email}`);

  // Create demo project
  const project = await prisma.project.create({
    data: {
      name: 'E-commerce Platform Launch',
      description: 'Build and launch a new e-commerce platform with modern tech stack',
      deadline: new Date('2024-12-31'),
      status: 'active',
      createdBy: manager.id,
      members: {
        create: [
          { userId: manager.id },
          { userId: member.id },
        ],
      },
    },
  });
  console.log(`✅ Created demo project: ${project.name}`);

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Setup project repository',
        description: 'Initialize Git repository and setup branch structure',
        projectId: project.id,
        createdBy: manager.id,
        assignedTo: member.id,
        dueDate: new Date('2024-06-15'),
        priority: 'high',
        status: 'completed',
        completedAt: new Date('2024-06-10'),
      },
      {
        title: 'Design database schema',
        description: 'Create PostgreSQL schema with all required tables',
        projectId: project.id,
        createdBy: manager.id,
        assignedTo: member.id,
        dueDate: new Date('2024-06-20'),
        priority: 'high',
        status: 'in_progress',
      },
      {
        title: 'Implement authentication',
        description: 'Add JWT authentication and session management',
        projectId: project.id,
        createdBy: manager.id,
        assignedTo: member.id,
        dueDate: new Date('2024-06-25'),
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Build UI components',
        description: 'Create reusable React components with shadcn/ui',
        projectId: project.id,
        createdBy: manager.id,
        assignedTo: member.id,
        dueDate: new Date('2024-07-01'),
        priority: 'medium',
        status: 'todo',
      },
      {
        title: 'Write API documentation',
        description: 'Create OpenAPI specification for all endpoints',
        projectId: project.id,
        createdBy: manager.id,
        dueDate: new Date('2024-07-10'),
        priority: 'low',
        status: 'todo',
      },
    ],
  });
  console.log(`✅ Created sample tasks`);

  // Get the task we just created for comment
  const task = await prisma.task.findFirst({
    where: { title: 'Design database schema' }
  });

  if (task) {
    await prisma.taskComment.create({
      data: {
        content: 'Great progress on this task! Let me know if you need any help.',
        taskId: task.id,
        userId: manager.id,
      },
    });
    console.log(`✅ Created sample comment`);
  }

  // Create notification preferences (don't store in variables)
  await prisma.notificationPreference.createMany({
    data: [
      { userId: admin.id, type: 'TASK_ASSIGNED', emailEnabled: true, inAppEnabled: true },
      { userId: admin.id, type: 'COMMENT_ADDED', emailEnabled: true, inAppEnabled: true },
      { userId: manager.id, type: 'TASK_ASSIGNED', emailEnabled: true, inAppEnabled: true },
      { userId: manager.id, type: 'COMMENT_ADDED', emailEnabled: true, inAppEnabled: true },
      { userId: member.id, type: 'TASK_ASSIGNED', emailEnabled: true, inAppEnabled: true },
      { userId: member.id, type: 'COMMENT_ADDED', emailEnabled: true, inAppEnabled: true },
    ],
  });
  console.log(`✅ Created notification preferences`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Demo Accounts:');
  console.log('   Admin:    admin@demo.com / Admin123!');
  console.log('   Manager:  manager@demo.com / Manager123!');
  console.log('   Member:   member@demo.com / Member123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });