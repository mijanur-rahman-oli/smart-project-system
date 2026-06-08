// src/components/features/projects/ProjectDetails.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Edit, 
  Trash, 
  MoreVertical,
  ArrowLeft,
  Settings,
  UserPlus
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { TaskBoard } from '@/components/features/tasks/TaskBoard';
import { ProjectMembers } from './ProjectMembers';
import { ActivityLogList } from '@/components/features/activity/ActivityLogList';
import { deleteProjectAction } from '@/server/actions/project.actions';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'on_hold';
  deadline: Date;
  createdAt: Date;
  creator: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  members: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
      role: string;
    };
    joinedAt: Date;
  }>;
  tasks: Array<any>;
  _count: {
    tasks: number;
    members: number;
  };
}

interface ProjectDetailsProps {
  project: Project;
  currentUserId: string;
  currentUserRole: string;
  onUpdate: () => void;
}

export function ProjectDetails({ project, currentUserId, currentUserRole, onUpdate }: ProjectDetailsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const completionRate = project._count.tasks > 0
    ? (project.tasks.filter(t => t.status === 'completed').length / project._count.tasks) * 100
    : 0;

  const daysRemaining = differenceInDays(new Date(project.deadline), new Date());
  const isOverdue = daysRemaining < 0 && project.status !== 'completed';
  const isCreator = project.creator.id === currentUserId;
  const canEdit = currentUserRole === 'admin' || isCreator;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProjectAction(project.id);
      if (result.success) {
        toast.success(result.message);
        router.push('/dashboard/projects');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor()}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created by {project.creator.name} • {format(new Date(project.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}/members`)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}/settings`)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
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
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`mt-1 ${getStatusColor()}`}>
                  {project.status}
                </Badge>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className={`text-lg font-semibold mt-1 ${isOverdue ? 'text-red-500' : ''}`}>
                  {format(new Date(project.deadline), 'MMM dd, yyyy')}
                </p>
                {isOverdue && (
                  <p className="text-xs text-red-500">Overdue by {Math.abs(daysRemaining)} days</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-lg font-semibold mt-1">{completionRate.toFixed(0)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team</p>
                <p className="text-lg font-semibold mt-1">{project._count.members} members</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>About this project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({project._count.tasks})</TabsTrigger>
          <TabsTrigger value="members">Team ({project._count.members})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <TaskBoard 
            initialTasks={project.tasks}
            projectId={project.id}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onRefresh={onUpdate}
          />
        </TabsContent>

        <TabsContent value="members">
          <ProjectMembers 
            projectId={project.id}
            members={project.members}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            projectCreatorId={project.creator.id}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLogList 
            projectId={project.id}
            limit={20}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
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
    </div>
  );
}