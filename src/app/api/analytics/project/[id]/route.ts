// src/app/api/analytics/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';

const idParamSchema = z.object({
  id: z.string().cuid('Invalid project ID'),
});

const querySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

// GET /api/analytics/projects/:id - Get project-specific analytics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = idParamSchema.parse(params);
    const searchParams = request.nextUrl.searchParams;
    const { days } = querySchema.parse({
      days: searchParams.get('days'),
    });

    // Check project access
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        tasks: {
          include: {
            assignee: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const hasAccess = project.createdBy === user.id ||
      project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const tasksByPriority = {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    };

    // Member contribution
    const memberContribution = project.members.map(member => {
      const memberTasks = tasks.filter(t => t.assignedTo === member.userId);
      const completed = memberTasks.filter(t => t.status === 'completed').length;
      
      return {
        userId: member.userId,
        name: member.user.name,
        avatarUrl: member.user.avatarUrl,
        totalTasks: memberTasks.length,
        completedTasks: completed,
        completionRate: memberTasks.length > 0 ? (completed / memberTasks.length) * 100 : 0,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    // Timeline data
    const startDate = subDays(new Date(), days);
    
    const tasksCreatedTimeline = await prisma.task.groupBy({
      by: ['createdAt'],
      where: {
        projectId: id,
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
    });

    const tasksCompletedTimeline = await prisma.task.groupBy({
      by: ['completedAt'],
      where: {
        projectId: id,
        completedAt: { gte: startDate },
        status: 'completed',
      },
      _count: {
        id: true,
      },
    });

    const dateRange = eachDayOfInterval({
      start: startDate,
      end: new Date(),
    });

    const timeline = dateRange.map(date => ({
      date: format(date, 'MMM dd'),
      tasksCreated: tasksCreatedTimeline.filter(t => 
        format(t.createdAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length,
      tasksCompleted: tasksCompletedTimeline.filter(t => 
        t.completedAt && format(t.completedAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length,
    }));

    // Activity log for this project
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        entityType: 'project',
        entityId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Upcoming deadlines
    const upcomingTasks = tasks
      .filter(t => t.status !== 'completed' && t.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10)
      .map(task => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        assignee: task.assignee?.name,
      }));

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          deadline: project.deadline,
          createdAt: project.createdAt,
        },
        metrics: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          todoTasks,
          overdueTasks,
          completionRate,
        },
        tasksByPriority,
        memberContribution,
        timeline,
        recentActivity,
        upcomingTasks,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/projects/:id error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}