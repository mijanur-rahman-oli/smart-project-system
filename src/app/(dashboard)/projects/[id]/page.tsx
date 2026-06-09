'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, EditIcon, UsersIcon, CheckCircleIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getProjectAction } from '@/server/actions/project.actions';
import { TaskBoard } from '@/components/features/tasks/TaskBoard';

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

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-32 mb-6" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{project.status}</Badge>
              <span className="text-sm text-muted-foreground">
                Due {new Date(project.deadline).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/projects/${projectId}/edit`)}>
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/projects/${projectId}/members`)}>
            <UsersIcon className="h-4 w-4 mr-2" />
            Members
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-2xl font-bold">{project._count?.tasks || 0}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">{project._count?.members || 0}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {project.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{project.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskBoard 
            initialTasks={project.tasks || []}
            projectId={projectId}
            currentUserId=""
            currentUserRole="team_member"
            onRefresh={fetchProject}
          />
        </CardContent>
      </Card>
    </div>
  );
}