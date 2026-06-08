// src/components/features/team/WorkloadReport.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon } from 'lucide-react';

interface WorkloadData {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  role: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  upcomingDeadlines: Array<{
    taskId: string;
    taskTitle: string;
    dueDate: Date;
    priority: string;
  }>;
}

interface TeamStats {
  totalMembers: number;
  totalTasks: number;
  totalCompletedTasks: number;
  totalOverdueTasks: number;
  averageCompletionRate: number;
  members: WorkloadData[];
}

interface WorkloadReportProps {
  projectId: string;
}

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

export function WorkloadReport({ projectId }: WorkloadReportProps) {
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<WorkloadData | null>(null);

  useEffect(() => {
    fetchWorkloadReport();
  }, [projectId]);

  const fetchWorkloadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/workload`);
      const data = await response.json();
      if (data.success) {
        setTeamStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch workload report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!teamStats) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No workload data available</p>
        </CardContent>
      </Card>
    );
  }

  const memberChartData = teamStats.members.map(member => ({
    name: member.userName.split(' ')[0],
    total: member.totalTasks,
    completed: member.completedTasks,
    completionRate: member.completionRate,
  }));

  const priorityDistribution = [
    { name: 'High', value: teamStats.members.reduce((sum, m) => sum + m.tasksByPriority.high, 0) },
    { name: 'Medium', value: teamStats.members.reduce((sum, m) => sum + m.tasksByPriority.medium, 0) },
    { name: 'Low', value: teamStats.members.reduce((sum, m) => sum + m.tasksByPriority.low, 0) },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">Across all members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teamStats.totalCompletedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {((teamStats.totalCompletedTasks / teamStats.totalTasks) * 100).toFixed(0)}% completion rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{teamStats.totalOverdueTasks}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Productivity</CardTitle>
            <CardDescription>Tasks distribution by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={memberChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Total Tasks" />
                <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Tasks by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Member Details */}
      <Card>
        <CardHeader>
          <CardTitle>Member Performance</CardTitle>
          <CardDescription>Detailed workload breakdown by team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {teamStats.members.map((member) => (
              <div key={member.userId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.userAvatar || undefined} />
                      <AvatarFallback>
                        {member.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{member.userName}</h3>
                      <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                    </div>
                  </div>
                  <Badge variant={member.overdueTasks > 0 ? 'destructive' : 'default'}>
                    {member.overdueTasks} Overdue
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-2xl font-semibold">{member.totalTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-semibold text-green-600">{member.completedTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-semibold text-blue-600">{member.inProgressTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To Do</p>
                    <p className="text-2xl font-semibold text-yellow-600">{member.todoTasks}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion Rate</span>
                    <span>{member.completionRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={member.completionRate} className="h-2" />
                </div>
                
                {member.upcomingDeadlines.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Upcoming Deadlines</p>
                    <div className="space-y-1">
                      {member.upcomingDeadlines.map((deadline) => (
                        <div key={deadline.taskId} className="flex justify-between text-sm">
                          <span>{deadline.taskTitle}</span>
                          <Badge variant="outline" className={deadline.priority === 'high' ? 'border-red-500 text-red-500' : ''}>
                            {new Date(deadline.dueDate).toLocaleDateString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}