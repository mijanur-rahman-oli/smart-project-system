// src/app/(dashboard)/projects/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  SearchIcon, 
  LayoutGridIcon, 
  ListIcon, 
  RefreshCwIcon, 
  FolderIcon,
  EyeIcon,
  EditIcon,
  TrashIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProjectsAction, deleteProjectAction } from '@/server/actions/project.actions';
import { ProjectListSkeleton } from '@/components/ui/skeleton-loader';
import { toast } from 'sonner';
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

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'on_hold';
  deadline: Date;
  createdAt: Date;
  creator: {
    name: string;
    email: string;
  };
  _count: {
    tasks: number;
    members: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('status', statusFilter);
      const result = await getProjectsAction(formData);
      if (result.success) {
        setProjects(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteProjectAction(projectToDelete.id);
      if (result.success) {
        toast.success(result.message);
        fetchProjects();
        setProjectToDelete(null);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusCount = (status: string) => {
    if (status === 'all') return projects.length;
    return projects.filter(p => p.status === status).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500';
      case 'completed': return 'bg-blue-500/10 text-blue-500';
      case 'on_hold': return 'bg-yellow-500/10 text-yellow-500';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your projects
          </p>
        </div>
        {/* UPDATED: Link to working create-project route */}
        <Button onClick={() => router.push('/create-project')} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <p className="text-sm text-muted-foreground">Total Projects</p>
          <p className="text-2xl font-bold">{projects.length}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {projects.filter(p => p.status === 'active').length}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <p className="text-sm text-muted-foreground">On Hold</p>
          <p className="text-2xl font-bold text-yellow-600">
            {projects.filter(p => p.status === 'on_hold').length}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-purple-600">
            {projects.filter(p => p.status === 'completed').length}
          </p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({getStatusCount('all')})</SelectItem>
              <SelectItem value="active">Active ({getStatusCount('active')})</SelectItem>
              <SelectItem value="on_hold">On Hold ({getStatusCount('on_hold')})</SelectItem>
              <SelectItem value="completed">Completed ({getStatusCount('completed')})</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="icon" onClick={fetchProjects}>
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Projects List */}
      {loading ? (
        <ProjectListSkeleton />
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <FolderIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No projects found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first project'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'all') ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              // UPDATED: Link to working create-project route
              <Button onClick={() => router.push('/create-project')}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onDelete={() => setProjectToDelete(project)}
              onView={() => router.push(`/projects/${project.id}`)}
              onEdit={() => router.push(`/projects/${project.id}/edit`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <ProjectListItem 
              key={project.id} 
              project={project}
              onDelete={() => setProjectToDelete(project)}
              onView={() => router.push(`/projects/${project.id}`)}
              onEdit={() => router.push(`/projects/${project.id}/edit`)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
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

// Project Card Component
function ProjectCard({ project, onDelete, onView, onEdit }: { 
  project: Project; 
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500';
      case 'completed': return 'bg-blue-500/10 text-blue-500';
      case 'on_hold': return 'bg-yellow-500/10 text-yellow-500';
      default: return '';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer group">
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 
              className="font-semibold text-lg hover:text-primary transition-colors"
              onClick={onView}
            >
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Created by {project.creator.name}
            </p>
          </div>
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
        </div>
        
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>📋 {project._count.tasks} tasks</span>
          <span>👥 {project._count.members} members</span>
          <span>📅 Due {new Date(project.deadline).toLocaleDateString()}</span>
        </div>
        
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onView}>
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Project List Item Component
function ProjectListItem({ project, onDelete, onView, onEdit }: { 
  project: Project; 
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500';
      case 'completed': return 'bg-blue-500/10 text-blue-500';
      case 'on_hold': return 'bg-yellow-500/10 text-yellow-500';
      default: return '';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-center justify-between" onClick={onView}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg truncate">{project.name}</h3>
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>📋 {project._count.tasks} tasks</span>
            <span>👥 {project._count.members} members</span>
            <span>📅 Due {new Date(project.deadline).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={onView}>
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}