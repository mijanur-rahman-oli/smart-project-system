// src/components/features/dashboard/KPICards.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FolderIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  AlertCircleIcon,
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  CalendarIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPI {
  label: string;
  value: number;
  change?: number;
  icon: any;
  color: string;
  suffix?: string;
}

interface KPICardsProps {
  metrics: {
    projects: { total: number; completionRate: number };
    tasks: { completed: number; total: number; overdue: number; completionRate: number };
    team: { totalMembers: number; activeMembers: number };
    tasksCreatedToday?: number;
    tasksCompletedToday?: number;
  };
}

export function KPICards({ metrics }: KPICardsProps) {
  const kpis: KPI[] = [
    {
      label: 'Total Projects',
      value: metrics.projects.total,
      change: metrics.projects.completionRate,
      icon: FolderIcon,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      label: 'Task Completion',
      value: metrics.tasks.completionRate,
      change: metrics.tasks.completionRate,
      icon: CheckCircleIcon,
      color: 'bg-green-500/10 text-green-500',
      suffix: '%',
    },
    {
      label: 'Active Tasks',
      value: metrics.tasks.total - metrics.tasks.completed,
      icon: ActivityIcon,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      label: 'Overdue Tasks',
      value: metrics.tasks.overdue,
      icon: AlertCircleIcon,
      color: 'bg-red-500/10 text-red-500',
    },
    {
      label: 'Team Members',
      value: metrics.team.totalMembers,
      icon: UsersIcon,
      color: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      label: 'Active Members',
      value: metrics.team.activeMembers,
      icon: TrendingUpIcon,
      color: 'bg-emerald-500/10 text-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
            <div className={cn("p-2 rounded-lg", kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof kpi.value === 'number' && kpi.value % 1 !== 0 
                ? kpi.value.toFixed(1) 
                : kpi.value}
              {kpi.suffix || ''}
            </div>
            {kpi.change !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.change > 0 ? '↑' : '↓'} {Math.abs(kpi.change)}% completion rate
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}