// src/components/features/tasks/CreateTaskDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateTaskForm } from './CreateTaskForm';
import { getProjectAction } from '@/server/actions/project.actions';
import { Skeleton } from '@/components/ui/skeleton';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function CreateTaskDialog({ open, onOpenChange, projectId, onSuccess }: CreateTaskDialogProps) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && projectId) {
      fetchProject();
    }
  }, [open, projectId]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const result = await getProjectAction(projectId);
      if (result.success) {
        setProject(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : project ? (
          <CreateTaskForm
            projectId={projectId}
            projectMembers={project.members.map((m: any) => m.user)}
            onSuccess={handleSuccess}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load project data
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}