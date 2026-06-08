// src/app/(dashboard)/tasks/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  PlusIcon, 
  SearchIcon, 
  FilterIcon, 
  CalendarIcon,
  UserIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LayoutGridIcon,
  ListIcon,
  RefreshCwIcon,
  XIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, isPast, isToday, isThisWeek } from 'date-fns';
import { toast } from 'sonner';
import { getTasksAction, updateTaskStatusAction, bulkUpdateTaskStatusAction } from '@/server/actions/task.actions';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  project: {
    id: string;
    name: string;
    status: string;
  };
  _count: {
    comments: number;
    attachments: number;
  };
}

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    assignedTo: searchParams.get('assignedTo') || '',
    projectId: searchParams.get('projectId') || '',
    search: searchParams.get('search') || '',
    dateRange: {
      from: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      to: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
    },
  });
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    fetchTasks();
  }, [filters, sortBy, sortOrder, pagination.page]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await getTasksAction({
        ...filters,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: 20,
      });
      
      if (result.success) {
        setTasks(result.data.tasks);
        setPagination({
          page: result.data.pagination.page,
          total: result.data.pagination.total,
          totalPages: result.data.pagination.totalPages,
        });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const result = await updateTaskStatusAction(taskId, newStatus);
      if (result.success) {
        toast.success(result.message);
        fetchTasks();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;
    
    try {
      const result = await bulkUpdateTaskStatusAction(selectedTasks, newStatus);
      if (result.success) {
        toast.success(result.message);
        setSelectedTasks([]);
        fetchTasks();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update tasks');
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      assignedTo: '',
      projectId: '',
      search: '',
      dateRange: { from: undefined, to: undefined },
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-500/10 text-gray-500';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      default: return '';
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => {
    if (typeof v === 'string') return v && v !== '';
    if (typeof v === 'object') return v.from || v.to;
    return false;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your tasks across projects
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/tasks/create')} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {tasks.filter(t => t.status === 'in_progress').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {tasks.filter(t => isPast(new Date(t.dueDate)) && t.status !== 'completed').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircleIcon className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTasks.length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedTasks.length === tasks.length}
                onCheckedChange={() => {
                  if (selectedTasks.length === tasks.length) {
                    setSelectedTasks([]);
                  } else {
                    setSelectedTasks(tasks.map(t => t.id));
                  }
                }}
              />
              <span className="text-sm font-medium">
                {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={handleBulkStatusChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTasks([])}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title or description..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select 
              value={filters.status} 
              onValueChange={(v) => setFilters({ ...filters, status: v })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select 
              value={filters.priority} 
              onValueChange={(v) => setFilters({ ...filters, priority: v })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, 'MMM dd')} - {format(filters.dateRange.to, 'MMM dd')}
                      </>
                    ) : (
                      format(filters.dateRange.from, 'MMM dd')
                    )
                  ) : (
                    'Date Range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: filters.dateRange.from,
                    to: filters.dateRange.to,
                  }}
                  onSelect={(range) => setFilters({ 
                    ...filters, 
                    dateRange: { from: range?.from, to: range?.to } 
                  })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <XIcon className="h-4 w-4" />
                Clear ({activeFilterCount})
              </Button>
            )}

            {/* View Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-8 w-8 p-0"
              >
                <LayoutGridIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={fetchTasks}>
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filters.status && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status}
                  <XIcon 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters({ ...filters, status: '' })}
                  />
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="gap-1">
                  Priority: {filters.priority}
                  <XIcon 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters({ ...filters, priority: '' })}
                  />
                </Badge>
              )}
              {filters.dateRange.from && (
                <Badge variant="secondary" className="gap-1">
                  Date: {format(filters.dateRange.from, 'MMM dd')} 
                  {filters.dateRange.to && ` - ${format(filters.dateRange.to, 'MMM dd')}`}
                  <XIcon 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters({ ...filters, dateRange: { from: undefined, to: undefined } })}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Tasks List */}
      {loading ? (
        <TasksListSkeleton />
      ) : tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <CheckCircleIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No tasks found</h3>
              <p className="text-muted-foreground">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first task'}
              </p>
            </div>
            {activeFilterCount > 0 ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => router.push('/dashboard/tasks/create')}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              isSelected={selectedTasks.includes(task.id)}
              onSelect={(checked) => {
                if (checked) {
                  setSelectedTasks([...selectedTasks, task.id]);
                } else {
                  setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                }
              }}
              onStatusChange={handleStatusChange}
              onRefresh={fetchTasks}
            />
          ))}
        </div>
      ) : (
        <TaskKanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onRefresh={fetchTasks}
        />
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

// Task List Item Component
function TaskListItem({ task, isSelected, onSelect, onStatusChange, onRefresh }: any) {
  const router = useRouter();
  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const dueDate = new Date(task.dueDate);

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-md transition-all cursor-pointer",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
          
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                Due {format(dueDate, 'MMM dd, yyyy')}
                {!isOverdue && isToday(dueDate) && ' (Today)'}
                {!isOverdue && isThisWeek(dueDate) && !isToday(dueDate) && ' (This week)'}
              </span>
            </div>
            
            {task.assignee && (
              <div className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                <span>{task.assignee.name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <span>📋 {task._count.comments}</span>
              <span>📎 {task._count.attachments}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={task.status}
            onValueChange={(value) => {
              onStatusChange(task.id, value);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

// Task Kanban Board Component
function TaskKanbanBoard({ tasks, onStatusChange, onRefresh }: any) {
  const columns = {
    todo: tasks.filter((t: Task) => t.status === 'todo'),
    in_progress: tasks.filter((t: Task) => t.status === 'in_progress'),
    completed: tasks.filter((t: Task) => t.status === 'completed'),
  };

  const columnConfig = {
    todo: { title: 'To Do', color: 'bg-gray-500', icon: '📋' },
    in_progress: { title: 'In Progress', color: 'bg-blue-500', icon: '🔄' },
    completed: { title: 'Completed', color: 'bg-green-500', icon: '✅' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(columns).map(([status, columnTasks]) => (
        <div key={status} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {columnConfig[status as keyof typeof columnConfig].icon}{' '}
              {columnConfig[status as keyof typeof columnConfig].title}
            </h3>
            <Badge variant="secondary">{columnTasks.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {columnTasks.map((task: Task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanTaskCard({ task, onStatusChange }: any) {
  const router = useRouter();
  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';

  return (
    <Card 
      className="p-3 hover:shadow-md transition-all cursor-pointer"
      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
        </div>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between pt-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            <span className={isOverdue ? 'text-red-500' : ''}>
              {format(new Date(task.dueDate), 'MMM dd')}
            </span>
          </div>
          
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {task.assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </Card>
  );
}

function TasksListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-4 w-4 mt-1" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
              <div className="flex gap-4 mt-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-500/10 text-red-500';
    case 'medium': return 'bg-yellow-500/10 text-yellow-500';
    case 'low': return 'bg-green-500/10 text-green-500';
    default: return '';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'todo': return 'bg-gray-500/10 text-gray-500';
    case 'in_progress': return 'bg-blue-500/10 text-blue-500';
    case 'completed': return 'bg-green-500/10 text-green-500';
    default: return '';
  }
}