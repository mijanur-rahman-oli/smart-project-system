// src/components/features/tasks/TaskCard.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MessageCircle, Paperclip, User, MoreVertical, Edit, Trash, Flag } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { format, differenceInDays, isPast } from 'date-fns';
import { deleteTaskAction } from '@/server/actions/task.actions';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: Date;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  _count: {
    comments: number;
    attachments: number;
  };
}

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  currentUserRole: string;
  onUpdate: () => void;
}

export function TaskCard({ task, currentUserId, currentUserRole, onUpdate }: TaskCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const daysRemaining = differenceInDays(new Date(task.dueDate), new Date());
  const canEdit = currentUserRole === 'admin' || 
                  currentUserRole === 'project_manager' || 
                  task.assignee?.id === currentUserId;

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const getPriorityIcon = () => {
    switch (task.priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTaskAction(task.id);
      if (result.success) {
        toast.success(result.message);
        onUpdate();
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <Badge className={getPriorityColor()}>
                {getPriorityIcon()} {task.priority}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
              {daysRemaining <= 2 && daysRemaining > 0 && task.status !== 'completed' && (
                <Badge variant="outline" className="text-orange-500">
                  Due in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/tasks/${task.id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <h4 className="font-semibold text-base mt-2 line-clamp-2">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                {format(new Date(task.dueDate), 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {task._count.comments > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MessageCircle className="h-3 w-3" />
                  <span className="text-xs">{task._count.comments}</span>
                </div>
              )}
              {task._count.attachments > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span className="text-xs">{task._count.attachments}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0">
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {task.assignee.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="text-xs">Unassigned</span>
            </div>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}