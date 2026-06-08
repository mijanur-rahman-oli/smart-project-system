// src/app/api/cron/update-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { startOfDay, subDays } from 'date-fns';

const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';

// POST /api/cron/update-metrics - Update analytics metrics
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    
    // Calculate daily metrics
    const tasksCreated = await prisma.task.count({
      where: {
        createdAt: { gte: yesterday, lt: today },
      },
    });
    
    const tasksCompleted = await prisma.task.count({
      where: {
        completedAt: { gte: yesterday, lt: today },
        status: 'completed',
      },
    });
    
    const activeUsers = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: yesterday, lt: today },
      },
    });
    
    const projectsCreated = await prisma.project.count({
      where: {
        createdAt: { gte: yesterday, lt: today },
      },
    });
    
    // Store metrics snapshot
    await prisma.metricSnapshot.create({
      data: {
        metricType: 'daily_activity',
        value: tasksCreated,
        metadata: {
          tasksCompleted,
          activeUsers: activeUsers.length,
          projectsCreated,
          date: yesterday,
        },
        timestamp: yesterday,
      },
    });
    
    // Update team activity summary for each project
    const projects = await prisma.project.findMany({
      select: { id: true },
    });
    
    for (const project of projects) {
      const projectTasksCreated = await prisma.task.count({
        where: {
          projectId: project.id,
          createdAt: { gte: yesterday, lt: today },
        },
      });
      
      const projectTasksCompleted = await prisma.task.count({
        where: {
          projectId: project.id,
          completedAt: { gte: yesterday, lt: today },
          status: 'completed',
        },
      });
      
      const projectComments = await prisma.taskComment.count({
        where: {
          task: { projectId: project.id },
          createdAt: { gte: yesterday, lt: today },
        },
      });
      
      const activeMembers = await prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          entityType: 'project',
          entityId: project.id,
          createdAt: { gte: yesterday, lt: today },
        },
      });
      
      await prisma.teamActivitySummary.upsert({
        where: {
          projectId_date: {
            projectId: project.id,
            date: yesterday,
          },
        },
        update: {
          tasksCreated: projectTasksCreated,
          tasksCompleted: projectTasksCompleted,
          commentsAdded: projectComments,
          activeMembers: activeMembers.length,
        },
        create: {
          projectId: project.id,
          date: yesterday,
          tasksCreated: projectTasksCreated,
          tasksCompleted: projectTasksCompleted,
          commentsAdded: projectComments,
          activeMembers: activeMembers.length,
        },
      });
    }
    
    // Update user workload metrics
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    
    const weekStart = startOfDay(subDays(today, 7));
    
    for (const user of users) {
      const tasks = await prisma.task.findMany({
        where: {
          assignedTo: user.id,
          createdAt: { gte: weekStart },
        },
      });
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => t.dueDate < new Date() && t.status !== 'completed').length;
      
      await prisma.userWorkload.upsert({
        where: {
          userId_weekStart: {
            userId: user.id,
            weekStart,
          },
        },
        update: {
          totalTasks,
          completedTasks,
          overdueTasks,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          weekStart,
          totalTasks,
          completedTasks,
          overdueTasks,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        tasksCreated,
        tasksCompleted,
        activeUsers: activeUsers.length,
        projectsCreated,
        projectsUpdated: projects.length,
        usersUpdated: users.length,
      },
      message: 'Metrics updated successfully',
    });
  } catch (error) {
    console.error('Cron update metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}