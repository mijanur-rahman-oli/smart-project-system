// src/components/features/projects/ProjectCard.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Users, CheckCircle, MoreVertical, Edit, Trash } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useState } from 'react';
import { deleteProjectAction } from '@/server/actions/project.actions';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'on_hold';
  deadline: Date;
  createdAt: Date;
  creator: { name: string; email: string };
  _count: { tasks: number; members: number };
}

interface ProjectCardProps {
  project: Project;
  onRefresh: () => void;
}

export function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const daysRemaining = differenceInDays(new Date(project.deadline), new Date());
  const isOverdue = daysRemaining < 0 && project.status !== 'completed';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProjectAction(project.id);
      if (result.success) {
        toast.success(result.message);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusColor = () => {
    switch (project.status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'on_hold': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-all cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 
                className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Created by {project.creator.name}
              </p>
            </div>
            <Badge className={getStatusColor()}>
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {project.description || 'No description provided'}
          </p>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className={isOverdue ? 'text-red-500' : ''}>
                {format(new Date(project.deadline), 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{project._count.members}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              <span>{project._count.tasks} tasks</span>
            </div>
          </div>
          
          {isOverdue && (
            <p className="text-xs text-red-500 mt-2">
              Overdue by {Math.abs(daysRemaining)} days
            </p>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2 pt-0">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}/members`)}>
                Manage Members
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
              All tasks, comments, and attachments will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}