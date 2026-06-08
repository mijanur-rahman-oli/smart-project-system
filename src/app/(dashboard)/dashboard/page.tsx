// src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UsersIcon, 
  FolderIcon, 
  CheckCircleIcon,
  CalendarIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  ActivityIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { getDashboardMetrics } from '@/server/actions/analytics.actions';

interface DashboardData {
  projects: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    completionRate: number;
    recentProjects: Array<{
      id: string;
      name: string;
      status: string;
      deadline: Date;
      progress: number;
    }>;
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
    recentTasks: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
      dueDate: Date;
      projectName: string;
    }>;
  };
  team: {
    totalMembers: number;
    activeMembers: number;
    averageTasksPerMember: number;
    topPerformers: Array<{
      id: string;
      name: string;
      avatarUrl: string | null;
      completedTasks: number;
      completionRate: number;
    }>;
    recentActivity: Array<{
      id: string;
      user: {
        name: string;
        avatarUrl: string | null;
      };
      action: string;
      target: string;
      createdAt: Date;
    }>;
  };
  timeline: {
    tasksCreated: Array<{ date: string; count: number }>;
    tasksCompleted: Array<{ date: string; count: number }>;
    projectActivity: Array<{ date: string; projects: number; tasks: number }>;
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
  performance: {
    averageCompletionTime: number;
    onTimeCompletionRate: number;
    tasksPerMember: number;
    velocity: number;
    trend: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const result = await getDashboardMetrics({ days: timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90 });
      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    toast.success('Dashboard refreshed');
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
          <ActivityIcon className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Unable to load dashboard</h3>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
        <Button onClick={fetchDashboardData}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Pre-formatted clean data for Recharts Pie to prevent calculation mismatch cycles
  const priorityChartData = [
    { name: 'High Priority', value: data.tasks.byPriority.high },
    { name: 'Medium Priority', value: data.tasks.byPriority.medium },
    { name: 'Low Priority', value: data.tasks.byPriority.low },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md p-1 bg-background">
            <Button
              variant={timeRange === '7d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('7d')}
              className="h-8 px-3"
            >
              7D
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('30d')}
              className="h-8 px-3"
            >
              30D
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('90d')}
              className="h-8 px-3"
            >
              90D
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projects.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.projects.active} active • {data.projects.completed} completed
            </p>
            <Progress value={data.projects.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tasks.completionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.tasks.completed} of {data.tasks.total} tasks completed
            </p>
            <Progress value={data.tasks.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.team.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.team.activeMembers} active this week
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Avg {data.team.averageTasksPerMember.toFixed(1)} tasks/member
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Tasks</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.upcoming.dueThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">
              due this week
            </p>
            {data.upcoming.overdue > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {data.upcoming.overdue} tasks overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                <p className="text-2xl font-bold">{data.performance.averageCompletionTime} days</p>
              </div>
              <div className={`flex items-center ${data.performance.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.performance.trend >= 0 ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                <span className="text-sm">{Math.abs(data.performance.trend)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">On-Time Completion</p>
              <p className="text-2xl font-bold text-green-600">{data.performance.onTimeCompletionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Tasks Per Member</p>
              <p className="text-2xl font-bold">{data.performance.tasksPerMember.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Team Velocity</p>
              <p className="text-2xl font-bold">{data.performance.velocity} tasks/week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Task Activity Trends</CardTitle>
            <CardDescription>
              Tasks created vs completed over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.timeline.tasksCreated.map((item, index) => ({
                date: item.date,
                created: item.count,
                completed: data.timeline.tasksCompleted[index]?.count || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                  name="Tasks Created"
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="2" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                  name="Tasks Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>
              Breakdown by priority and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100px">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
              <div>
                <p className="text-red-500 font-semibold">{data.tasks.byPriority.high}</p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
              <div>
                <p className="text-yellow-500 font-semibold">{data.tasks.byPriority.medium}</p>
                <p className="text-xs text-muted-foreground">Medium</p>
              </div>
              <div>
                <p className="text-green-500 font-semibold">{data.tasks.byPriority.low}</p>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upcoming Tasks</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard/tasks')}
                className="gap-1"
              >
                View all
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Tasks that need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.upcoming.upcomingTasks.slice(0, 5).map((task) => {
                const daysUntilDue = differenceInDays(new Date(task.dueDate), new Date());
                const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;
                const isOverdue = daysUntilDue < 0;
                
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{task.title}</p>
                        <Badge variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{task.projectName}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className={`text-xs font-medium ${
                        isOverdue ? 'text-red-500' : isUrgent ? 'text-orange-500' : ''
                      }`}>
                        {isOverdue ? 'Overdue' : format(new Date(task.dueDate), 'MMM dd')}
                      </p>
                      {!isOverdue && daysUntilDue >= 0 && (
                        <p className="text-xs text-muted-foreground">
                          {daysUntilDue === 0 ? 'Today' : `${daysUntilDue} days left`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {data.upcoming.upcomingTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming tasks</p>
                  <p className="text-sm">Great job staying on top of your work!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>
              Team members with highest completion rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.team.topPerformers.map((performer, index) => (
                <div key={performer.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={performer.avatarUrl || undefined} />
                    <AvatarFallback>
                      {performer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{performer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {performer.completedTasks} tasks completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {performer.completionRate.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">completion</p>
                  </div>
                </div>
              ))}
              {data.team.topPerformers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest actions from your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.team.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.user.avatarUrl || undefined} />
                    <AvatarFallback>
                      {activity.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>
                      {' '}
                      <span className="text-muted-foreground">{activity.action}</span>
                      {' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.createdAt), 'MMM dd, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              {data.team.recentActivity.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ActivityIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Projects</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/dashboard/projects')}
              className="gap-1"
            >
              View all
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Your most recently active projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.projects.recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{project.name}</h4>
                    <Badge variant={
                      project.status === 'active' ? 'default' :
                      project.status === 'completed' ? 'secondary' : 'outline'
                    }>
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Due {format(new Date(project.deadline), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex-1 max-w-xs">
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    <span className="text-xs font-medium">{project.progress}%</span>
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Sections Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}