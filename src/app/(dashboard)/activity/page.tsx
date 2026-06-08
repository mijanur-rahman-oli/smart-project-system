// src/app/(dashboard)/activity/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  ActivityIcon, 
  FilterIcon, 
  DownloadIcon, 
  SearchIcon,
  CalendarIcon,
  UserIcon,
  FolderIcon,
  CheckCircleIcon,
  MessageCircleIcon,
  UserPlusIcon,
  SettingsIcon,
  RefreshCwIcon,
  XIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { toast } from 'sonner';
import { getActivityLogs, exportActivityLogs } from '@/server/actions/activity.actions';

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  metadata: any;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

const actionIcons: Record<string, any> = {
  PROJECT_CREATED: FolderIcon,
  PROJECT_UPDATED: FolderIcon,
  PROJECT_DELETED: FolderIcon,
  TASK_CREATED: CheckCircleIcon,
  TASK_UPDATED: CheckCircleIcon,
  TASK_DELETED: CheckCircleIcon,
  TASK_ASSIGNED: UserIcon,
  TASK_STATUS_UPDATED: RefreshCwIcon,
  COMMENT_ADDED: MessageCircleIcon,
  MEMBER_ADDED: UserPlusIcon,
  MEMBER_REMOVED: UserPlusIcon,
  SETTINGS_UPDATED: SettingsIcon,
};

const actionColors: Record<string, string> = {
  PROJECT_CREATED: 'bg-green-500/10 text-green-500',
  PROJECT_UPDATED: 'bg-blue-500/10 text-blue-500',
  PROJECT_DELETED: 'bg-red-500/10 text-red-500',
  TASK_CREATED: 'bg-green-500/10 text-green-500',
  TASK_UPDATED: 'bg-blue-500/10 text-blue-500',
  TASK_DELETED: 'bg-red-500/10 text-red-500',
  TASK_ASSIGNED: 'bg-purple-500/10 text-purple-500',
  TASK_STATUS_UPDATED: 'bg-yellow-500/10 text-yellow-500',
  COMMENT_ADDED: 'bg-indigo-500/10 text-indigo-500',
  MEMBER_ADDED: 'bg-emerald-500/10 text-emerald-500',
  MEMBER_REMOVED: 'bg-orange-500/10 text-orange-500',
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [pagination.page, actionFilter, dateRange]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const result = await getActivityLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        startDate: dateRange.from,
        endDate: dateRange.to,
        page: pagination.page,
        limit: 50,
      });
      if (result.success) {
        setActivities(result.data);
        setPagination({
          page: result.pagination.page,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const result = await exportActivityLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        startDate: dateRange.from,
        endDate: dateRange.to,
        format,
      });
      if (result.success) {
        // Create download link
        const blob = new Blob([result.data], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Activities exported as ${format.toUpperCase()}`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to export activities');
    } finally {
      setExporting(false);
    }
  };

  const filteredActivities = activities.filter(activity =>
    activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.entityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.user?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionLabel = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground mt-1">
            Track all actions and changes across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')} disabled={exporting}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
            <ActivityIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold text-blue-600">
                {activities.filter(a => new Date(a.createdAt) >= dateRange.from).length}
              </p>
            </div>
            <CalendarIcon className="h-5 w-5 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unique Users</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(activities.map(a => a.user?.id)).size}
              </p>
            </div>
            <UserIcon className="h-5 w-5 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Most Active</p>
              <p className="text-lg font-bold truncate">
                {Object.entries(
                  activities.reduce((acc, a) => {
                    if (a.user?.name) acc[a.user.name] = (acc[a.user.name] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
              </p>
            </div>
            <ActivityIcon className="h-5 w-5 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="PROJECT_CREATED">Project Created</SelectItem>
              <SelectItem value="PROJECT_UPDATED">Project Updated</SelectItem>
              <SelectItem value="PROJECT_DELETED">Project Deleted</SelectItem>
              <SelectItem value="TASK_CREATED">Task Created</SelectItem>
              <SelectItem value="TASK_UPDATED">Task Updated</SelectItem>
              <SelectItem value="TASK_DELETED">Task Deleted</SelectItem>
              <SelectItem value="TASK_ASSIGNED">Task Assigned</SelectItem>
              <SelectItem value="TASK_STATUS_UPDATED">Task Status Changed</SelectItem>
              <SelectItem value="COMMENT_ADDED">Comment Added</SelectItem>
              <SelectItem value="MEMBER_ADDED">Member Added</SelectItem>
              <SelectItem value="MEMBER_REMOVED">Member Removed</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => range && setDateRange({ from: range.from!, to: range.to! })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={fetchActivities}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Activities List */}
      {loading ? (
        <ActivitiesListSkeleton />
      ) : filteredActivities.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <ActivityIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No activities found</h3>
              <p className="text-muted-foreground">
                {searchQuery || actionFilter !== 'all' ? 'Try adjusting your filters' : 'Activities will appear here as users interact with the platform'}
              </p>
            </div>
            {(searchQuery || actionFilter !== 'all') && (
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setActionFilter('all');
              }}>
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredActivities.map((activity) => {
                const Icon = actionIcons[activity.action] || ActivityIcon;
                const colorClass = actionColors[activity.action] || 'bg-gray-500/10 text-gray-500';
                
                return (
                  <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.user?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {activity.user?.name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{activity.user?.name || 'System'}</span>
                          <Badge className={colorClass}>
                            <Icon className="h-3 w-3 mr-1" />
                            {getActionLabel(activity.action)}
                          </Badge>
                          {activity.entityName && (
                            <>
                              <span className="text-muted-foreground">on</span>
                              <Badge variant="outline">
                                {activity.entityName}
                              </Badge>
                            </>
                          )}
                        </div>
                        
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {activity.action === 'TASK_ASSIGNED' && (
                              <p>Assigned to {activity.metadata.assignedToName || 'unknown'}</p>
                            )}
                            {activity.action === 'TASK_STATUS_UPDATED' && (
                              <p>Status changed from {activity.metadata.oldStatus} to {activity.metadata.newStatus}</p>
                            )}
                            {activity.action === 'PROJECT_UPDATED' && activity.metadata.changes && (
                              <p>Updated fields: {Object.keys(activity.metadata.changes).join(', ')}</p>
                            )}
                            {activity.action === 'COMMENT_ADDED' && (
                              <p>"{activity.metadata.commentPreview}"</p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <time dateTime={new Date(activity.createdAt).toISOString()}>
                            {format(new Date(activity.createdAt), 'PPP p')}
                          </time>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function ActivitiesListSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-4 mt-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}