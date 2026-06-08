// src/components/features/activity/ActivityLogList.tsx
'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  ActivityIcon, 
  SearchIcon, 
  FilterIcon, 
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  FolderIcon,
  CheckCircleIcon,
  MessageCircleIcon,
  UserPlusIcon,
  SettingsIcon,
  RefreshCwIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { getActivityLogs, exportActivityLogs } from '@/server/actions/activity.actions';
import { toast } from 'sonner';

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

interface ActivityLogListProps {
  projectId?: string;
  userId?: string;
  limit?: number;
  compact?: boolean;
  onRefresh?: () => void;
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

export function ActivityLogList({ projectId, userId, limit = 20, compact = false, onRefresh }: ActivityLogListProps) {
  const [logs, setLogs] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, actionFilter, dateRange, projectId, userId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await getActivityLogs({
        projectId,
        userId,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        startDate: dateRange.from,
        endDate: dateRange.to,
        search: searchQuery || undefined,
        page: pagination.page,
        limit,
      });
      if (result.success) {
        setLogs(result.data);
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
        projectId,
        userId,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        startDate: dateRange.from,
        endDate: dateRange.to,
        format,
      });
      if (result.success) {
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

  const getActionLabel = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (compact) {
    return (
      <div className="space-y-4">
        {logs.slice(0, 10).map((log) => {
          const Icon = actionIcons[log.action] || ActivityIcon;
          return (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={log.user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {log.user?.name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{log.user?.name || 'System'}</span>
                  {' '}
                  <span className="text-muted-foreground">{getActionLabel(log.action)}</span>
                  {' '}
                  {log.entityName && (
                    <span className="font-medium">"{log.entityName}"</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No activity yet</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="PROJECT_CREATED">Project Created</SelectItem>
            <SelectItem value="PROJECT_UPDATED">Project Updated</SelectItem>
            <SelectItem value="TASK_CREATED">Task Created</SelectItem>
            <SelectItem value="TASK_UPDATED">Task Updated</SelectItem>
            <SelectItem value="TASK_ASSIGNED">Task Assigned</SelectItem>
            <SelectItem value="TASK_STATUS_UPDATED">Task Status Changed</SelectItem>
            <SelectItem value="COMMENT_ADDED">Comment Added</SelectItem>
            <SelectItem value="MEMBER_ADDED">Member Added</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                ) : (
                  format(dateRange.from, 'MMM dd')
                )
              ) : (
                'Date Range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
            />
            <div className="flex gap-2 p-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setDateRange({})} className="flex-1">
                Clear
              </Button>
              <Button size="sm" onClick={fetchLogs} className="flex-1">
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>
          <DownloadIcon className="h-4 w-4 mr-2" />
          Export CSV
        </Button>

        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCwIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
                <Skeleton className="h-3 w-32 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ActivityIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No activities found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map((log) => {
                const Icon = actionIcons[log.action] || ActivityIcon;
                const colorClass = actionColors[log.action] || 'bg-gray-500/10 text-gray-500';
                
                return (
                  <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={log.user?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {log.user?.name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{log.user?.name || 'System'}</span>
                          <Badge className={colorClass}>
                            <Icon className="h-3 w-3 mr-1" />
                            {getActionLabel(log.action)}
                          </Badge>
                          {log.entityName && (
                            <>
                              <span className="text-muted-foreground">on</span>
                              <span className="font-medium">{log.entityName}</span>
                            </>
                          )}
                        </div>
                        
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {log.action === 'TASK_ASSIGNED' && (
                              <p>Assigned to {log.metadata.assignedToName || 'unknown'}</p>
                            )}
                            {log.action === 'TASK_STATUS_UPDATED' && (
                              <p>Status changed from {log.metadata.oldStatus} to {log.metadata.newStatus}</p>
                            )}
                            {log.action === 'PROJECT_UPDATED' && log.metadata.changes && (
                              <p>Updated fields: {Object.keys(log.metadata.changes).join(', ')}</p>
                            )}
                            {log.action === 'COMMENT_ADDED' && (
                              <p>"{log.metadata.commentPreview}"</p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <time dateTime={new Date(log.createdAt).toISOString()}>
                            {format(new Date(log.createdAt), 'PPP p')}
                          </time>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
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
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
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
            <ChevronRightIcon className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}