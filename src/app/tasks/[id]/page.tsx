// src/app/tasks/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  EditIcon, 
  TrashIcon, 
  UserIcon, 
  CalendarIcon, 
  FlagIcon,
  CheckCircleIcon,
  ClockIcon
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTaskAction, deleteTaskAction, updateTaskStatusAction } from '@/server/actions/task.actions';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const result = await getTaskAction(taskId);
      if (result.success) {
        setTask(result.data);
      } else {
        toast.error(result.error);
        router.push('/dashboard/tasks');
      }
    } catch (error) {
      toast.error('Failed to fetch task');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const result = await updateTaskStatusAction(taskId, newStatus);
      if (result.success) {
        toast.success(result.message);
        fetchTask();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const result = await deleteTaskAction(taskId);
        if (result.success) {
          toast.success(result.message);
          router.push('/dashboard/tasks');
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!task) return null;

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline">{task.status?.replace('_', ' ')}</Badge>
                  <Badge className={getPriorityColor(task.priority)}>
                    <FlagIcon className="h-3 w-3 mr-1" />
                    {task.priority}
                  </Badge>
                  {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => router.push(`/tasks/${taskId}/edit`)}>
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-500">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {task.description || 'No description provided'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Assignee</p>
                <div className="flex items-center gap-2 mt-1">
                  <UserIcon className="h-4 w-4" />
                  <span>{task.assignee?.name || 'Unassigned'}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span className={isOverdue ? 'text-red-500' : ''}>
                    {format(new Date(task.dueDate), 'PPP')}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <span>{task.project?.name}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <span>{format(new Date(task.createdAt), 'PPP')}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{task._count?.comments || 0}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{task._count?.attachments || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '📋'}
                </p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}