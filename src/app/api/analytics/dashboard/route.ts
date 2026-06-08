// src/app/api/analytics/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';

// GET /api/analytics/dashboard - Get dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Build access filters
    let projectFilter = {};
    
    if (user.role !== 'admin') {
      const accessibleProjects = await prisma.project.findMany({
        where: {
          OR: [
            { createdBy: user.id },
            { members: { some: { userId: user.id } } }
          ]
        },
        select: { id: true }
      });
      
      const projectIds = accessibleProjects.map(p => p.id);
      projectFilter = { id: { in: projectIds } };
    }

    // Get projects data
    const projects = await prisma.project.findMany({
      where: projectFilter,
      include: {
        tasks: true,
        members: true,
      },
    });

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const onHoldProjects = projects.filter(p => p.status === 'on_hold').length;
    const projectCompletionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    // Get recent projects (last 5)
    const recentProjects = await prisma.project.findMany({
      where: projectFilter,
      include: {
        _count: {
          select: { tasks: true, members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get tasks data
    const allTasks = projects.flatMap(p => p.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = allTasks.filter(t => t.status === 'todo').length;
    const now = new Date();
    const overdueTasks = allTasks.filter(t => new Date(t.dueDate) < now && t.status !== 'completed').length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const tasksByPriority = {
      high: allTasks.filter(t => t.priority === 'high').length,
      medium: allTasks.filter(t => t.priority === 'medium').length,
      low: allTasks.filter(t => t.priority === 'low').length,
    };

    // Get recent tasks
    const recentTasks = await prisma.task.findMany({
      where: {
        projectId: { in: projects.map(p => p.id) },
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get team metrics
    const uniqueMembers = new Set();
    projects.forEach(project => {
      project.members.forEach(member => {
        uniqueMembers.add(member.userId);
      });
      uniqueMembers.add(project.createdBy);
    });
    
    const totalMembers = uniqueMembers.size;

    // Get member performance
    const memberPerformance = await prisma.user.findMany({
      where: {
        id: { in: Array.from(uniqueMembers) },
      },
      include: {
        assignedTasks: {
          where: {
            projectId: { in: projects.map(p => p.id) },
          },
        },
      },
    });

    const memberStats = memberPerformance.map(member => {
      const tasks = member.assignedTasks;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const total = tasks.length;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      
      return {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        completedTasks: completed,
        totalTasks: total,
        completionRate,
      };
    });

    const topPerformers = memberStats
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);

    const averageTasksPerMember = totalMembers > 0 ? totalTasks / totalMembers : 0;
    const activeMembers = memberStats.filter(m => m.completedTasks > 0 || m.totalTasks > 0).length;

    // Get timeline data
    const startDate = subDays(new Date(), days);
    
    const tasksCreatedTimeline = await prisma.task.groupBy({
      by: ['createdAt'],
      where: {
        projectId: { in: projects.map(p => p.id) },
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
    });

    const tasksCompletedTimeline = await prisma.task.groupBy({
      by: ['completedAt'],
      where: {
        projectId: { in: projects.map(p => p.id) },
        completedAt: { gte: startDate },
        status: 'completed',
      },
      _count: {
        id: true,
      },
    });

    // Format timeline data
    const dateRange = eachDayOfInterval({
      start: startDate,
      end: new Date(),
    });

    const tasksCreated = dateRange.map(date => ({
      date: format(date, 'MMM dd'),
      count: tasksCreatedTimeline.filter(t => 
        format(t.createdAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length,
    }));

    const tasksCompleted = dateRange.map(date => ({
      date: format(date, 'MMM dd'),
      count: tasksCompletedTimeline.filter(t => 
        t.completedAt && format(t.completedAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length,
    }));

    // Get upcoming tasks
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    
    const upcomingTasksData = allTasks
      .filter(t => t.status !== 'completed' && t.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10)
      .map(task => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        projectName: projects.find(p => p.id === task.projectId)?.name || '',
      }));

    const dueThisWeek = allTasks.filter(t => 
      t.status !== 'completed' && 
      t.dueDate && 
      new Date(t.dueDate) <= endOfWeek
    ).length;

    const noDeadline = allTasks.filter(t => !t.dueDate && t.status !== 'completed').length;

    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        entityType: { in: ['project', 'task'] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Performance metrics
    const averageCompletionTime = allTasks
      .filter(t => t.completedAt && t.createdAt)
      .reduce((acc, t) => {
        const days = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return acc + days;
      }, 0) / (allTasks.filter(t => t.completedAt).length || 1);

    const onTimeCompletionRate = allTasks.filter(t => {
      if (t.status !== 'completed') return false;
      return new Date(t.completedAt!) <= new Date(t.dueDate);
    }).length / (allTasks.filter(t => t.status === 'completed').length || 1) * 100;

    const tasksPerMember = totalTasks / (totalMembers || 1);
    const velocity = tasksCompletedTimeline.length / (days / 7); // tasks per week

    return NextResponse.json({
      success: true,
      data: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          onHold: onHoldProjects,
          completionRate: projectCompletionRate,
          recentProjects: recentProjects.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            deadline: p.deadline,
            progress: p._count.tasks > 0 
              ? (p.tasks.filter(t => t.status === 'completed').length / p._count.tasks) * 100 
              : 0,
          })),
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          todo: todoTasks,
          overdue: overdueTasks,
          completionRate: taskCompletionRate,
          byPriority: tasksByPriority,
          recentTasks: recentTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            projectName: t.project.name,
            assignee: t.assignee,
          })),
        },
        team: {
          totalMembers,
          activeMembers,
          averageTasksPerMember,
          topPerformers,
          recentActivity: recentActivity.map(a => ({
            id: a.id,
            user: a.user,
            action: a.action,
            target: a.metadata?.taskTitle || a.metadata?.projectName || '',
            createdAt: a.createdAt,
          })),
        },
        timeline: {
          tasksCreated,
          tasksCompleted,
        },
        upcoming: {
          dueThisWeek,
          overdue: overdueTasks,
          noDeadline,
          upcomingTasks: upcomingTasksData,
        },
        performance: {
          averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
          onTimeCompletionRate: Math.round(onTimeCompletionRate),
          tasksPerMember: Math.round(tasksPerMember * 10) / 10,
          velocity: Math.round(velocity * 10) / 10,
          trend: 5, // This would come from comparing with previous period
        },
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/dashboard error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}