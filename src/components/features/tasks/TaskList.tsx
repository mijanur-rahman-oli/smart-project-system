// src/components/features/tasks/TaskList.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, MessageCircle, Paperclip, ChevronRight, CheckCircle, Circle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, differenceInDays, isPast } from 'date-fns';
import { updateTaskStatusAction } from '@/server/actions/task.actions';
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
  project: {
    id: string;
    name: string;
  };
  _count: {
    comments: number;
    attachments: number;
  };
}

interface TaskListProps {
  tasks: Task[];
  onStatusChange?: () => void;
  showProject?: boolean;
}

export function TaskList({ tasks, onStatusChange, showProject = false }: TaskListProps) {
  const router = useRouter();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleStatusToggle = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    setUpdatingTaskId(task.id);
    
    try {
      const result = await updateTaskStatusAction(task.id, newStatus);
      if (result.success) {
        toast.success(result.message);
        onStatusChange?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-green-500/10 text-green-500';
      default: return '';
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

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
        const daysRemaining = differenceInDays(new Date(task.dueDate), new Date());
        
        return (
          <Card 
            key={task.id}
            className="p-4 hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
          >
            <div className="flex items-start gap-4">
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleStatusToggle(task)}
                  disabled={updatingTaskId === task.id}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h4>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  {task.status === 'in_progress' && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                      <Clock className="h-3 w-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {task.description}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                      Due {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                      {isOverdue && ' (Overdue)'}
                      {!isOverdue && daysRemaining <= 3 && daysRemaining > 0 && ` (${daysRemaining} days left)`}
                    </span>
                  </div>
                  
                  {task.assignee && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={task.assignee.avatarUrl || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(task.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{task.assignee.name}</span>
                    </div>
                  )}
                  
                  {showProject && (
                    <div className="flex items-center gap-1">
                      <span>📁 {task.project.name}</span>
                    </div>
                  )}
                  
                  {task._count.comments > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      <span>{task._count.comments}</span>
                    </div>
                  )}
                  
                  {task._count.attachments > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <span>{task._count.attachments}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}