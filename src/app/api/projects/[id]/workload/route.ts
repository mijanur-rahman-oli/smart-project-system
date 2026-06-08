// src/app/api/projects/[id]/workload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';

const idParamSchema = z.object({
  id: z.string().cuid('Invalid project ID'),
});

// GET /api/projects/:id/workload - Get team workload report
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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
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

    // Check access
    const hasAccess = project.createdBy === user.id ||
      project.members.some(m => m.userId === user.id) ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate workload for each member
    const workloadReports = await Promise.all(
      project.members.map(async (member) => {
        const tasks = await prisma.task.findMany({
          where: {
            projectId: id,
            assignedTo: member.userId,
          },
        });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
        const todoTasks = tasks.filter(t => t.status === 'todo').length;
        const overdueTasks = tasks.filter(t => t.dueDate < new Date() && t.status !== 'completed').length;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const tasksByPriority = {
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length,
        };

        const upcomingDeadlines = tasks
          .filter(t => t.status !== 'completed' && t.dueDate > new Date())
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
          .slice(0, 5)
          .map(t => ({
            taskId: t.id,
            taskTitle: t.title,
            dueDate: t.dueDate,
            priority: t.priority,
          }));

        return {
          userId: member.user.id,
          userName: member.user.name,
          userEmail: member.user.email,
          userAvatar: member.user.avatarUrl,
          role: member.user.role,
          totalTasks,
          completedTasks,
          inProgressTasks,
          todoTasks,
          overdueTasks,
          completionRate,
          tasksByPriority,
          upcomingDeadlines,
        };
      })
    );

    // Calculate team stats
    const teamStats = {
      totalMembers: workloadReports.length,
      totalTasks: workloadReports.reduce((sum, r) => sum + r.totalTasks, 0),
      totalCompletedTasks: workloadReports.reduce((sum, r) => sum + r.completedTasks, 0),
      totalOverdueTasks: workloadReports.reduce((sum, r) => sum + r.overdueTasks, 0),
      averageCompletionRate: workloadReports.reduce((sum, r) => sum + r.completionRate, 0) / workloadReports.length,
      members: workloadReports,
    };

    return NextResponse.json({
      success: true,
      data: teamStats,
    });
  } catch (error) {
    console.error('GET /api/projects/:id/workload error:', error);
    
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