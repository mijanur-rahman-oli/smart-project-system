'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, EditIcon, TrashIcon, UserIcon, CalendarIcon, FlagIcon, CheckCircleIcon, ClockIcon, MessageCircleIcon, PaperclipIcon, MoreVerticalIcon } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTaskAction, updateTaskStatusAction, deleteTaskAction } from '@/server/actions/task.actions';
import { CommentsSection } from '@/components/features/comments/CommentsSection';
import { FileAttachment } from '@/components/features/attachments/FileAttachment';

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
      toast.error('Failed to update task status');
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
    return <TaskDetailSkeleton />;
  }

  if (!task) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">Task not found</h1>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const completionPercentage = task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0;

  return (
    <div className="container max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{task.project?.name}</Badge>
              <Badge className={task.priority === 'high' ? 'bg-red-500/10 text-red-500' : task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}>
                <FlagIcon className="h-3 w-3 mr-1" />
                {task.priority}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 border rounded-md"
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/tasks/${taskId}/edit`)}>
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-500">
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{task.description || 'No description provided'}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <CommentsSection 
                taskId={taskId}
                currentUser={{ id: task.createdBy, name: 'User', avatarUrl: null, role: 'team_member' }}
                onCommentCountChange={() => {}}
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  {task.attachments?.length === 0 ? (
                    <p className="text-muted-foreground">No attachments</p>
                  ) : (
                    <div className="space-y-2">
                      {task.attachments?.map((file: any) => (
                        <FileAttachment key={file.id} attachment={file} canDelete={false} compact />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={completionPercentage} />
              <p className="text-sm text-muted-foreground mt-2">{completionPercentage}% Complete</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assignee</span>
                <span>{task.assignee?.name || 'Unassigned'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className={isOverdue ? 'text-red-500' : ''}>
                  {format(new Date(task.dueDate), 'PPP')}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project</span>
                <span>{task.project?.name}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
