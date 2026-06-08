// src/server/services/analytics.service.ts
import { prisma } from '@/lib/db/prisma';
import { startOfDay, subDays, format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

export interface DashboardMetrics {
  projects: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    completionRate: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
    completionRate: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
  };
  team: {
    totalMembers: number;
    activeMembers: number;
    averageTasksPerMember: number;
    topPerformers: Array<{
      userId: string;
      name: string;
      completedTasks: number;
      completionRate: number;
    }>;
  };
  timeline: {
    tasksCreated: Array<{ date: string; count: number }>;
    tasksCompleted: Array<{ date: string; count: number }>;
    activeProjects: Array<{ date: string; count: number }>;
  };
  upcoming: {
    dueThisWeek: number;
    overdue: number;
    noDeadline: number;
    upcomingTasks: Array<{
      id: string;
      title: string;
      dueDate: Date;
      priority: string;
      projectName: string;
    }>;
  };
}

export async function getDashboardMetrics(userId: string, userRole: string): Promise<DashboardMetrics> {
  // Build access filters based on user role
  let projectFilter = {};
  
  if (userRole !== 'admin') {
    const accessibleProjects = await prisma.project.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } }
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
  
  // Get tasks data
  const allTasks = projects.flatMap(p => p.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = allTasks.filter(t => t.status === 'todo').length;
  const now = new Date();
  const overdueTasks = allTasks.filter(t => t.dueDate < now && t.status !== 'completed').length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const tasksByPriority = {
    high: allTasks.filter(t => t.priority === 'high').length,
    medium: allTasks.filter(t => t.priority === 'medium').length,
    low: allTasks.filter(t => t.priority === 'low').length,
  };
  
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
      userId: member.id,
      name: member.name,
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
  
  // Get timeline data (last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30);
  
  const tasksCreatedTimeline = await prisma.task.groupBy({
    by: ['createdAt'],
    where: {
      projectId: { in: projects.map(p => p.id) },
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: {
      id: true,
    },
  });
  
  const tasksCompletedTimeline = await prisma.task.groupBy({
    by: ['completedAt'],
    where: {
      projectId: { in: projects.map(p => p.id) },
      completedAt: { gte: thirtyDaysAgo },
      status: 'completed',
    },
    _count: {
      id: true,
    },
  });
  
  // Format timeline data
  const dateRange = eachDayOfInterval({
    start: thirtyDaysAgo,
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
  const endOfThisWeek = endOfWeek(new Date());
  const upcomingTasksData = allTasks
    .filter(t => t.status !== 'completed' && t.dueDate)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
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
    t.dueDate <= endOfThisWeek
  ).length;
  
  const noDeadline = allTasks.filter(t => !t.dueDate && t.status !== 'completed').length;
  
  // Get active projects timeline
  const activeProjectsTimeline = dateRange.map(date => ({
    date: format(date, 'MMM dd'),
    count: projects.filter(p => 
      p.status === 'active' && 
      p.createdAt <= date &&
      (!p.updatedAt || p.updatedAt >= date)
    ).length,
  }));
  
  return {
    projects: {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      onHold: onHoldProjects,
      completionRate: projectCompletionRate,
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
      overdue: overdueTasks,
      completionRate: taskCompletionRate,
      byPriority: tasksByPriority,
    },
    team: {
      totalMembers,
      activeMembers,
      averageTasksPerMember,
      topPerformers,
    },
    timeline: {
      tasksCreated,
      tasksCompleted,
      activeProjects: activeProjectsTimeline,
    },
    upcoming: {
      dueThisWeek,
      overdue: overdueTasks,
      noDeadline,
      upcomingTasks: upcomingTasksData,
    },
  };
}

export async function getRealTimeMetrics() {
  const now = new Date();
  const today = startOfDay(now);
  
  const [tasksCreatedToday, tasksCompletedToday, activeUsers] = await Promise.all([
    prisma.task.count({
      where: {
        createdAt: { gte: today },
      },
    }),
    prisma.task.count({
      where: {
        completedAt: { gte: today },
        status: 'completed',
      },
    }),
    prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: subDays(now, 1) },
      },
    }),
  ]);
  
  return {
    tasksCreatedToday,
    tasksCompletedToday,
    activeUsersToday: activeUsers.length,
    timestamp: now,
  };
}

export async function getProjectAnalytics(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        include: {
          assignee: true,
        },
      },
      members: {
        include: {
          user: true,
        },
      },
    },
  });
  
  if (!project) return null;
  
  const tasks = project.tasks;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const overdueTasks = tasks.filter(t => t.dueDate < new Date() && t.status !== 'completed').length;
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const memberContribution = project.members.map(member => {
    const memberTasks = tasks.filter(t => t.assignedTo === member.userId);
    const completed = memberTasks.filter(t => t.status === 'completed').length;
    
    return {
      userId: member.userId,
      name: member.user.name,
      totalTasks: memberTasks.length,
      completedTasks: completed,
      completionRate: memberTasks.length > 0 ? (completed / memberTasks.length) * 100 : 0,
    };
  });
  
  const tasksByPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };
  
  const tasksByAssignee = tasks.reduce((acc, task) => {
    const assigneeName = task.assignee?.name || 'Unassigned';
    acc[assigneeName] = (acc[assigneeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      deadline: project.deadline,
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
    tasksByAssignee,
    memberContribution: memberContribution.sort((a, b) => b.completionRate - a.completionRate),
  };
}

// Cache management
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedDashboardMetrics(userId: string, userRole: string) {
  const cacheKey = `dashboard:${userId}:${userRole}`;
  
  const cached = await prisma.analyticsCache.findUnique({
    where: { cacheKey },
  });
  
  if (cached && cached.expiresAt > new Date()) {
    return cached.data as DashboardMetrics;
  }
  
  const metrics = await getDashboardMetrics(userId, userRole);
  
  await prisma.analyticsCache.upsert({
    where: { cacheKey },
    update: {
      data: metrics,
      expiresAt: new Date(Date.now() + CACHE_TTL),
      updatedAt: new Date(),
    },
    create: {
      cacheKey,
      data: metrics,
      expiresAt: new Date(Date.now() + CACHE_TTL),
    },
  });
  
  return metrics;
}