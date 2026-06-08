// src/components/features/projects/ProjectStats.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

interface MemberStats {
  id: string;
  name: string;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
}

interface ProjectStatsProps {
  taskStats: TaskStats;
  memberStats: MemberStats[];
}

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

export function ProjectStats({ taskStats, memberStats }: ProjectStatsProps) {
  const priorityData = [
    { name: 'High', value: taskStats.byPriority.high, color: PRIORITY_COLORS.high },
    { name: 'Medium', value: taskStats.byPriority.medium, color: PRIORITY_COLORS.medium },
    { name: 'Low', value: taskStats.byPriority.low, color: PRIORITY_COLORS.low },
  ];

  const statusData = [
    { name: 'Completed', value: taskStats.completed, color: '#22c55e' },
    { name: 'In Progress', value: taskStats.inProgress, color: '#eab308' },
    { name: 'To Do', value: taskStats.todo, color: '#6b7280' },
  ];

  const completionRate = taskStats.total > 0 
    ? (taskStats.completed / taskStats.total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Completion Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Task Completion</span>
            <span className="font-medium">{completionRate.toFixed(0)}%</span>
          </div>
          <Progress value={completionRate} />
          <div className="grid grid-cols-3 gap-4 pt-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{taskStats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{taskStats.todo}</p>
              <p className="text-xs text-muted-foreground">To Do</p>
            </div>
          </div>
          {taskStats.overdue > 0 && (
            <div className="mt-2 p-2 bg-red-500/10 rounded-lg text-center">
              <p className="text-sm text-red-600">
                ⚠️ {taskStats.overdue} task{taskStats.overdue !== 1 ? 's are' : ' is'} overdue
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Member Performance */}
      {memberStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memberStats.map((member) => (
                <div key={member.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-muted-foreground">
                      {member.completedTasks}/{member.totalTasks} tasks
                    </span>
                  </div>
                  <Progress value={member.completionRate} />
                  <div className="flex justify-end">
                    <Badge variant={member.completionRate >= 80 ? 'default' : 'secondary'}>
                      {member.completionRate.toFixed(0)}% completion
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}