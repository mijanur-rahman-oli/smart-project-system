// src/app/(dashboard)/tasks/[id]/page.tsx
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
  ClockIcon,
  MessageCircleIcon,
  PaperclipIcon,
  MoreVerticalIcon,
  SendIcon,
  XIcon
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTaskByIdAction, deleteTaskAction, updateTaskStatusAction } from '@/server/actions/task.actions';
import { createCommentAction, deleteCommentAction } from '@/server/actions/comment.actions';
import { FileUpload } from '@/components/features/attachments/FileUpload';
import { FileAttachment } from '@/components/features/attachments/FileAttachment';

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  uploader: {
    name: string;
  };
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const result = await getTaskByIdAction(taskId);
      if (result.success) {
        setTask(result.data);
        setComments(result.data.comments || []);
        setAttachments(result.data.attachments || []);
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
    setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await createCommentAction({
        taskId,
        content: newComment,
      });
      
      if (result.success) {
        toast.success('Comment added');
        setNewComment('');
        fetchTask();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await deleteCommentAction(commentId);
      if (result.success) {
        toast.success('Comment deleted');
        fetchTask();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return <TaskDetailSkeleton />;
  }

  if (!task) {
    return null;
  }

  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const completionPercentage = task.status === 'completed' ? 100 : 
    task.status === 'in_progress' ? 50 : 0;

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
              <Badge variant="outline">{task.project.name}</Badge>
              <Badge className={
                task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-green-500/10 text-green-500'
              }>
                <FlagIcon className="h-3 w-3 mr-1" />
                {task.priority}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVerticalIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/tasks/${taskId}/edit`)}>
                <EditIcon className="h-4 w-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageCircleIcon className="h-4 w-4" />
                Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2">
                <PaperclipIcon className="h-4 w-4" />
                Files ({attachments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {task.description ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{task.description}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/50">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No description provided
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 mt-4">
              {/* Add Comment */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Write a comment... Use @ to mention someone"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end mt-2">
                        <Button 
                          size="sm" 
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || isSubmitting}
                        >
                          <SendIcon className="h-4 w-4 mr-2" />
                          {isSubmitting ? 'Posting...' : 'Post Comment'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comments List */}
              {comments.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <MessageCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No comments yet</p>
                    <p className="text-sm">Be the first to add a comment</p>
                  </CardContent>
                </Card>
              ) : (
                comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {comment.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-sm">{comment.user.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-6 w-6 p-0"
                            >
                              <XIcon className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4 mt-4">
              <FileUpload 
                onUpload={async (files) => {
                  // Handle file upload
                  fetchTask();
                }}
              />
              
              {attachments.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <PaperclipIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No attachments</p>
                    <p className="text-sm">Upload files to share with the team</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <FileAttachment
                      key={attachment.id}
                      attachment={attachment}
                      canDelete={true}
                      onDelete={() => fetchTask()}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Completion</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} />
              {task.status === 'completed' && (
                <p className="text-xs text-green-600 mt-2">
                  Completed {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                  <span>Assignee</span>
                </div>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {task.assignee.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Due Date</span>
                </div>
                <div className={isOverdue ? 'text-red-500 font-medium' : ''}>
                  {format(new Date(task.dueDate), 'PPP')}
                  {isOverdue && ' (Overdue)'}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ClockIcon className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <div>
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <Badge variant="outline">
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Project Card */}
          <Card>
            <CardHeader>
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-lg transition-colors"
                onClick={() => router.push(`/dashboard/projects/${task.project.id}`)}
              >
                <div>
                  <p className="font-medium">{task.project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.project.status === 'active' ? 'Active' : task.project.status}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>Task created by {task.creator.name}</span>
                </div>
                {task.status === 'completed' && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Task completed</span>
                  </div>
                )}
                {comments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>{comments.length} comments added</span>
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>{attachments.length} files attached</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
              All comments and attachments will be permanently deleted.
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

function TaskDetailSkeleton() {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    </div>
  );
}