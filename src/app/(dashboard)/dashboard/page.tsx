// src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDashboardMetrics } from '@/server/actions/analytics.actions';
import { KPICards } from '@/components/features/dashboard/KPICards';
import { Charts } from '@/components/features/dashboard/Charts';
import { UpcomingTasks } from '@/components/features/dashboard/UpcomingTasks';
import { RealTimeMetrics } from '@/components/features/dashboard/RealTimeMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const result = await getDashboardMetrics({ days: 30 });
      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </div>
    );
  }

  // Ensure data has default values to prevent undefined errors
  const safeData = {
    projects: data.projects || { total: 0, completionRate: 0 },
    tasks: data.tasks || { completed: 0, total: 0, overdue: 0, completionRate: 0, byPriority: { high: 0, medium: 0, low: 0 } },
    team: data.team || { totalMembers: 0, activeMembers: 0 },
    timeline: data.timeline || { tasksCreated: [], tasksCompleted: [], activeProjects: [] },
    upcoming: data.upcoming || { dueThisWeek: 0, overdue: 0, noDeadline: 0, upcomingTasks: [] },
    topPerformers: data.team?.topPerformers || [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening with your projects.
        </p>
      </div>

      <KPICards metrics={{
        projects: {
          total: safeData.projects.total,
          completionRate: safeData.projects.completionRate,
        },
        tasks: {
          completed: safeData.tasks.completed,
          total: safeData.tasks.total,
          overdue: safeData.tasks.overdue,
          completionRate: safeData.tasks.completionRate,
        },
        team: {
          totalMembers: safeData.team.totalMembers,
          activeMembers: safeData.team.activeMembers,
        },
      }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Charts 
            timeline={safeData.timeline}
            tasksByPriority={safeData.tasks.byPriority}
            topPerformers={safeData.topPerformers.map((p: any) => ({
              name: p.name,
              completedTasks: p.completedTasks,
              completionRate: p.completionRate,
            }))}
          />
        </div>
        <div className="space-y-6">
          <RealTimeMetrics />
          <UpcomingTasks 
            dueThisWeek={safeData.upcoming.dueThisWeek}
            overdue={safeData.upcoming.overdue}
            noDeadline={safeData.upcoming.noDeadline}
            upcomingTasks={safeData.upcoming.upcomingTasks}
          />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    </div>
  );
}