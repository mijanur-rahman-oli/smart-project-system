// src/components/features/dashboard/RealTimeMetrics.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityIcon, TrendingUpIcon, CheckCircleIcon, UsersIcon, ClockIcon } from 'lucide-react';

interface RealTimeData {
  tasksCreatedToday: number;
  tasksCompletedToday: number;
  activeUsersToday: number;
  tasksCreatedTrend: number;
  tasksCompletedTrend: number;
  activeUsersTrend: number;
  timestamp: Date;
}

export function RealTimeMetrics() {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRealTimeData = async () => {
    try {
      const response = await fetch('/api/analytics/realtime');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingUpIcon className="h-4 w-4 text-red-500 rotate-180" />;
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Real-Time Activity</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tasks Created Today */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ActivityIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Created Today</p>
                <p className="text-2xl font-bold">{data?.tasksCreatedToday || 0}</p>
              </div>
            </div>
            {data?.tasksCreatedTrend !== undefined && (
              <div className="flex items-center gap-1">
                {getTrendIcon(data.tasksCreatedTrend)}
                <span className={`text-sm ${data.tasksCreatedTrend > 0 ? 'text-green-500' : data.tasksCreatedTrend < 0 ? 'text-red-500' : ''}`}>
                  {Math.abs(data.tasksCreatedTrend)}%
                </span>
              </div>
            )}
          </div>

          {/* Tasks Completed Today */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed Today</p>
                <p className="text-2xl font-bold">{data?.tasksCompletedToday || 0}</p>
              </div>
            </div>
            {data?.tasksCompletedTrend !== undefined && (
              <div className="flex items-center gap-1">
                {getTrendIcon(data.tasksCompletedTrend)}
                <span className={`text-sm ${data.tasksCompletedTrend > 0 ? 'text-green-500' : data.tasksCompletedTrend < 0 ? 'text-red-500' : ''}`}>
                  {Math.abs(data.tasksCompletedTrend)}%
                </span>
              </div>
            )}
          </div>

          {/* Active Users Today */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <UsersIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users (24h)</p>
                <p className="text-2xl font-bold">{data?.activeUsersToday || 0}</p>
              </div>
            </div>
            {data?.activeUsersTrend !== undefined && (
              <div className="flex items-center gap-1">
                {getTrendIcon(data.activeUsersTrend)}
                <span className={`text-sm ${data.activeUsersTrend > 0 ? 'text-green-500' : data.activeUsersTrend < 0 ? 'text-red-500' : ''}`}>
                  {Math.abs(data.activeUsersTrend)}%
                </span>
              </div>
            )}
          </div>

          {/* Completion Rate */}
          {data && data.tasksCreatedToday > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Today's Completion Rate</p>
                <p className="text-sm font-medium">
                  {((data.tasksCompletedToday / data.tasksCreatedToday) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(data.tasksCompletedToday / data.tasksCreatedToday) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Last Updated */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}