// src/components/features/team/TeamAnalytics.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, subWeeks } from 'date-fns';

interface ActivityData {
  date: string;
  tasksCreated: number;
  tasksCompleted: number;
  commentsAdded: number;
  activeMembers: number;
}

interface TeamAnalyticsProps {
  projectId: string;
}

export function TeamAnalytics({ projectId }: TeamAnalyticsProps) {
  const [period, setPeriod] = useState('7d');
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityData();
  }, [projectId, period]);

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/analytics?period=${period}`);
      const data = await response.json();
      setActivityData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Team Analytics</h2>
          <p className="text-muted-foreground">Track team performance and activity trends</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="14d">Last 14 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Task Activity Trend</CardTitle>
          <CardDescription>Tasks created vs completed over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tasksCreated" stroke="#8884d8" name="Tasks Created" />
              <Line type="monotone" dataKey="tasksCompleted" stroke="#82ca9d" name="Tasks Completed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Team Engagement</CardTitle>
          <CardDescription>Comments and active members over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="commentsAdded" stackId="1" stroke="#ffc658" fill="#ffc658" name="Comments" yAxisId="left" />
              <Area type="monotone" dataKey="activeMembers" stackId="2" stroke="#ff7300" fill="#ff7300" name="Active Members" yAxisId="right" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}