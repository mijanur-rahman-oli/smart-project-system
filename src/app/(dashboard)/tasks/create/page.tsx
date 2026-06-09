'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateTaskForm } from '@/components/features/tasks/CreateTaskForm';
import { getProjectsAction } from '@/server/actions/project.actions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreateTaskPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      const result = await getProjectsAction(formData);
      if (result.success && result.data.length > 0) {
        setProjects(result.data);
        setSelectedProject(result.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto py-8">
        <Skeleton className="h-10 w-32 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
        </CardHeader>
        
        <CardContent>
          {projects.length > 1 && (
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Select Project</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {selectedProjectData && (
            <CreateTaskForm
              projectId={selectedProject}
              projectMembers={selectedProjectData.members || []}
              onSuccess={() => router.push('/dashboard/tasks')}
              onCancel={() => router.back()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}