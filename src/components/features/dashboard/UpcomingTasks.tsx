// src/components/features/dashboard/UpcomingTasks.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ClockIcon, AlertTriangleIcon, ChevronRightIcon } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';

interface UpcomingTask {
  id: string;
  title: string;
  dueDate: Date;
  priority: string;
  projectName: string;
}

interface UpcomingTasksProps {
  dueThisWeek: number;
  overdue: number;
  noDeadline: number;
  upcomingTasks: UpcomingTask[];
}

const priorityColors = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function UpcomingTasks({ dueThisWeek, overdue, noDeadline, upcomingTasks }: UpcomingTasksProps) {
  const router = useRouter();

  const getDueStatus = (dueDate: Date) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { label: 'Overdue', color: 'text-red-500', icon: AlertTriangleIcon };
    if (days === 0) return { label: 'Today', color: 'text-orange-500', icon: ClockIcon };
    if (days <= 3) return { label: `${days} days left`, color: 'text-yellow-500', icon: ClockIcon };
    return { label: `${days} days left`, color: 'text-muted-foreground', icon: CalendarIcon };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dueThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks requiring attention</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Past deadline</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-500/10 border-gray-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">No Deadline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{noDeadline}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks without due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Tasks that need your attention soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming tasks</p>
                <p className="text-sm">Great job staying on top of your work!</p>
              </div>
            ) : (
              upcomingTasks.map((task) => {
                const dueStatus = getDueStatus(new Date(task.dueDate));
                const DueIcon = dueStatus.icon;
                
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{task.title}</h4>
                        <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{task.projectName}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <div className={`flex items-center gap-1 text-sm font-medium ${dueStatus.color}`}>
                          <DueIcon className="h-4 w-4" />
                          {dueStatus.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { CheckCircleIcon } from 'lucide-react';