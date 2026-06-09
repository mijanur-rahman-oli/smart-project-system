// src/app/projects/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  EditIcon, 
  TrashIcon, 
  UsersIcon, 
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  PlusIcon,
  MoreVerticalIcon,
  UserIcon  // Added missing UserIcon import
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getProjectAction, deleteProjectAction } from '@/server/actions/project.actions';

interface ProjectMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
  joinedAt: Date;
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  assignee: { name: string; avatarUrl: string | null } | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const result = await getProjectAction(projectId);
      if (result.success) {
        setProject(result.data);
      } else {
        toast.error(result.error);
        router.push('/dashboard/projects');
      }
    } catch (error) {
      toast.error('Failed to fetch project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        const result = await deleteProjectAction(projectId);
        if (result.success) {
          toast.success(result.message);
          router.push('/dashboard/projects');
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  if (loading) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) return null;

  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((t: Task) => t.status === 'completed').length || 0;
  const inProgressTasks = project.tasks?.filter((t: Task) => t.status === 'in_progress').length || 0;
  const todoTasks = project.tasks?.filter((t: Task) => t.status === 'todo').length || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const daysRemaining = differenceInDays(new Date(project.deadline), new Date());
  const isOverdue = daysRemaining < 0 && project.status !== 'completed';

  const getStatusColor = () => {
    switch (project.status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'on_hold': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return '';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Projects
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge className={getStatusColor()}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Created by {project.creator?.name} • {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => router.push(`/projects/${projectId}/edit`)}>
                <EditIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                  <CheckCircleIcon className="h-5 w-5 text-primary" />
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
                  {!isOverdue && daysRemaining <= 7 && daysRemaining > 0 && (
                    <p className="text-xs text-yellow-500">{daysRemaining} days remaining</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-red-500" />
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
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <Progress value={completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Size</p>
                  <p className="text-lg font-semibold mt-1">{project._count?.members || 0} members</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <UsersIcon className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {project.description && (
          <Card className="mb-6">
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
            <TabsTrigger value="tasks">Tasks ({totalTasks})</TabsTrigger>
            <TabsTrigger value="members">Team ({project._count?.members || 0})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Task List</h3>
              <Button onClick={() => router.push('/create-task')} size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>

            {project.tasks?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by creating your first task</p>
                  <Button onClick={() => router.push('/create-task')}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {project.tasks.map((task: Task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onRefresh={fetchProject}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <Button onClick={() => router.push(`/projects/${projectId}/members`)} size="sm">
                <UsersIcon className="h-4 w-4 mr-2" />
                Manage Members
              </Button>
            </div>

            {project.members?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No team members yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.members.map((member: ProjectMember) => (
                  <MemberCard key={member.id} member={member} isCreator={project.createdBy === member.user.id} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Activity log will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const router = useRouter();
  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h4 className="font-semibold">{task.title}</h4>
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              <Badge variant="outline">
                {task.status.replace('_', ' ')}
              </Badge>
              {isOverdue && <Badge variant="destructive">Overdue</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                Due {format(new Date(task.dueDate), 'MMM dd, yyyy')}
              </div>
              {task.assignee && (
                <div className="flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  {task.assignee.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Member Card Component
function MemberCard({ member, isCreator }: { member: ProjectMember; isCreator: boolean }) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <Avatar className="h-16 w-16 mx-auto mb-3">
            <AvatarImage src={member.user.avatarUrl || undefined} />
            <AvatarFallback className="text-lg">
              {getInitials(member.user.name)}
            </AvatarFallback>
          </Avatar>
          <h4 className="font-semibold">{member.user.name}</h4>
          <p className="text-sm text-muted-foreground">{member.user.email}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline">
              {member.user.role === 'project_manager' ? 'Manager' : 'Member'}
            </Badge>
            {isCreator && <Badge className="bg-yellow-500/10 text-yellow-500">Owner</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-64" />
      </div>
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