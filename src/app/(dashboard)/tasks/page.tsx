// src/app/(dashboard)/tasks/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  SearchIcon, 
  CalendarIcon,
  UserIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LayoutGridIcon,
  ListIcon,
  RefreshCwIcon,
  XIcon,
  EyeIcon,
  EditIcon,
  TrashIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast, isToday, isThisWeek } from 'date-fns';
import { toast } from 'sonner';
import { getTasksAction, updateTaskStatusAction, deleteTaskAction } from '@/server/actions/task.actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignedTo: '',
    projectId: '',
    search: '',
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
  });

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await getTasksAction(filters);
      if (result.success) {
        setTasks(result.data.tasks || result.data || []);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteTaskAction(taskToDelete.id);
      if (result.success) {
        toast.success(result.message);
        fetchTasks();
        setTaskToDelete(null);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
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

  const clearFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      assignedTo: '',
      projectId: '',
      search: '',
      dateRange: { from: undefined, to: undefined },
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-green-500/10 text-green-500';
      default: return '';
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => {
    if (typeof v === 'string') return v && v !== 'all' && v !== '';
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
        {/* UPDATED: Link to working create-task route */}
        <Button onClick={() => router.push('/create-task')} className="gap-2">
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
              <p className="text-2xl font-bold">{tasks.length}</p>
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

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <XIcon className="h-4 w-4" />
              Clear ({activeFilterCount})
            </Button>
          )}

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

          <Button variant="outline" size="icon" onClick={fetchTasks}>
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
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
              // UPDATED: Link to working create-task route
              <Button onClick={() => router.push('/create-task')}>
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
              onStatusChange={handleStatusChange}
              onView={() => router.push(`/tasks/${task.id}`)}
              onDelete={() => setTaskToDelete(task)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Task List Item Component
function TaskListItem({ task, onStatusChange, onView, onDelete }: any) {
  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const dueDate = new Date(task.dueDate);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-green-500/10 text-green-500';
      default: return '';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between" onClick={onView}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge variant="outline">
              {task.status.replace('_', ' ')}
            </Badge>
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
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
              </span>
            </div>
            
            {task.assignee && (
              <div className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                <span>{task.assignee.name}</span>
              </div>
            )}
            
            <span>📋 {task._count.comments}</span>
            <span>📎 {task._count.attachments}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="px-2 py-1 text-sm border rounded-md"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <Button variant="ghost" size="sm" onClick={onView}>
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">
            <TrashIcon className="h-4 w-4" />
          </Button>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(columns).map(([status, columnTasks]) => (
        <div key={status} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {status === 'todo' && '📋 To Do'}
              {status === 'in_progress' && '🔄 In Progress'}
              {status === 'completed' && '✅ Completed'}
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-green-500/10 text-green-500';
      default: return '';
    }
  };

  return (
    <Card 
      className="p-3 hover:shadow-md transition-all cursor-pointer"
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            <span className={isOverdue ? 'text-red-500' : ''}>
              {format(new Date(task.dueDate), 'MMM dd')}
            </span>
          </div>
          
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">
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