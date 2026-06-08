// src/app/(dashboard)/projects/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, SearchIcon, FilterIcon, LayoutGridIcon, ListIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getProjectsAction } from '@/server/actions/project.actions';
import { ProjectCard } from '@/components/features/projects/ProjectCard';
import { ProjectListSkeleton } from '@/components/ui/skeleton-loader';

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
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, sortBy, sortOrder]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('status', statusFilter);
      formData.append('sortBy', sortBy);
      formData.append('sortOrder', sortOrder);
      
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

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusCount = (status: string) => {
    if (status === 'all') return projects.length;
    return projects.filter(p => p.status === status).length;
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
        <Button onClick={() => router.push('/dashboard/projects/create')} className="gap-2">
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
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
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

          {/* Sort By */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="name">Project Name</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="shrink-0"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </Button>

          {/* View Toggle */}
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

          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={fetchProjects} className="shrink-0">
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
              <Button onClick={() => router.push('/dashboard/projects/create')}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onUpdate={fetchProjects} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} onUpdate={fetchProjects} />
          ))}
        </div>
      )}
    </div>
  );
}

// List Item Component
function ProjectListItem({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const router = useRouter();

  return (
    <Card 
      className="p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg truncate">{project.name}</h3>
            <Badge variant={
              project.status === 'active' ? 'default' :
              project.status === 'completed' ? 'secondary' : 'outline'
            }>
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
        <Button variant="ghost" size="sm" onClick={(e) => {
          e.stopPropagation();
          router.push(`/dashboard/projects/${project.id}/edit`);
        }}>
          Edit
        </Button>
      </div>
    </Card>
  );
}

import { FolderIcon } from 'lucide-react';