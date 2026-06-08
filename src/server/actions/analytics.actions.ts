// src/server/actions/analytics.actions.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';

export async function getDashboardMetrics(options: { days?: number }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const days = options.days || 30;
    const startDate = subDays(new Date(), days);

    // Build access filters
    let projectFilter: any = {};
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

    // Get recent projects
    const recentProjects = await prisma.project.findMany({
      where: projectFilter,
      include: {
        _count: { select: { tasks: true, members: true } },
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
      where: { projectId: { in: projects.map(p => p.id) } },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get team metrics
    const uniqueMembers = new Set<string>();
    projects.forEach(project => {
      project.members.forEach(member => uniqueMembers.add(member.userId));
      uniqueMembers.add(project.createdBy);
    });
    
    const totalMembers = uniqueMembers.size;

    // Get member performance
    const memberPerformance = await prisma.user.findMany({
      where: { id: { in: Array.from(uniqueMembers) } },
      include: {
        assignedTasks: {
          where: { projectId: { in: projects.map(p => p.id) } },
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
    const tasksCreatedTimeline = await prisma.task.groupBy({
      by: ['createdAt'],
      where: {
        projectId: { in: projects.map(p => p.id) },
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    const tasksCompletedTimeline = await prisma.task.groupBy({
      by: ['completedAt'],
      where: {
        projectId: { in: projects.map(p => p.id) },
        completedAt: { gte: startDate },
        status: 'completed',
      },
      _count: { id: true },
    });

    // Format timeline data
    const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
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
      where: { entityType: { in: ['project', 'task'] } },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Performance metrics
    const completedTasksWithDates = allTasks.filter(t => t.completedAt && t.createdAt);
    const averageCompletionTime = completedTasksWithDates.reduce((acc, t) => {
      const days = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return acc + days;
    }, 0) / (completedTasksWithDates.length || 1);

    const onTimeCompletionRate = allTasks.filter(t => {
      if (t.status !== 'completed') return false;
      return new Date(t.completedAt!) <= new Date(t.dueDate);
    }).length / (allTasks.filter(t => t.status === 'completed').length || 1) * 100;

    const tasksPerMember = totalTasks / (totalMembers || 1);
    const velocity = tasksCompletedTimeline.length / (days / 7);

    return {
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
        timeline: { tasksCreated, tasksCompleted },
        upcoming: { dueThisWeek, overdue: overdueTasks, noDeadline, upcomingTasks: upcomingTasksData },
        performance: {
          averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
          onTimeCompletionRate: Math.round(onTimeCompletionRate),
          tasksPerMember: Math.round(tasksPerMember * 10) / 10,
          velocity: Math.round(velocity * 10) / 10,
          trend: 5,
        },
      },
    };
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    return { success: false, error: 'Failed to fetch dashboard metrics' };
  }
}

export async function getRealTimeMetrics() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);

    const [tasksCreatedToday, tasksCreatedYesterday, tasksCompletedToday, tasksCompletedYesterday, activeUsersToday, activeUsersYesterday] = await Promise.all([
      prisma.task.count({ where: { createdAt: { gte: today } } }),
      prisma.task.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      prisma.task.count({ where: { completedAt: { gte: today }, status: 'completed' } }),
      prisma.task.count({ where: { completedAt: { gte: yesterday, lt: today }, status: 'completed' } }),
      prisma.activityLog.groupBy({ by: ['userId'], where: { createdAt: { gte: today } } }),
      prisma.activityLog.groupBy({ by: ['userId'], where: { createdAt: { gte: yesterday, lt: today } } }),
    ]);

    const tasksCreatedTrend = tasksCreatedYesterday === 0 ? 100 : ((tasksCreatedToday - tasksCreatedYesterday) / tasksCreatedYesterday) * 100;
    const tasksCompletedTrend = tasksCompletedYesterday === 0 ? 100 : ((tasksCompletedToday - tasksCompletedYesterday) / tasksCompletedYesterday) * 100;
    const activeUsersTrend = activeUsersYesterday.length === 0 ? 100 : ((activeUsersToday.length - activeUsersYesterday.length) / activeUsersYesterday.length) * 100;

    return {
      success: true,
      data: {
        tasksCreatedToday,
        tasksCreatedTrend: Math.round(tasksCreatedTrend),
        tasksCompletedToday,
        tasksCompletedTrend: Math.round(tasksCompletedTrend),
        activeUsersToday: activeUsersToday.length,
        activeUsersTrend: Math.round(activeUsersTrend),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Get real-time metrics error:', error);
    return { success: false, error: 'Failed to fetch real-time metrics' };
  }
}

export async function getProjectAnalytics(projectId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: true } },
        tasks: { include: { assignee: true } },
      },
    });

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    const hasAccess = project.createdBy === user.id ||
      project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return { success: false, error: 'Access denied' };
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

    const recentActivity = await prisma.activityLog.findMany({
      where: { entityType: 'project', entityId: projectId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

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

    return {
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          deadline: project.deadline,
          createdAt: project.createdAt,
        },
        metrics: { totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks, completionRate },
        tasksByPriority,
        memberContribution,
        recentActivity,
        upcomingTasks,
      },
    };
  } catch (error) {
    console.error('Get project analytics error:', error);
    return { success: false, error: 'Failed to fetch project analytics' };
  }
}