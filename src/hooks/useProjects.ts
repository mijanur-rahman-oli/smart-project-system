// src/hooks/useProjects.ts
'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

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

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  total: number;
  page: number;
  hasMore: boolean;
  filters: {
    status?: string;
    search?: string;
  };
  fetchProjects: (page?: number, append?: boolean) => Promise<void>;
  createProject: (data: FormData) => Promise<{ success: boolean; error?: string }>;
  updateProject: (id: string, data: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  setFilters: (filters: { status?: string; search?: string }) => void;
  clearFilters: () => void;
}

export const useProjects = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  total: 0,
  page: 1,
  hasMore: true,
  filters: {},

  fetchProjects: async (page = 1, append = false) => {
    const { filters, isLoading, hasMore } = get();
    if (isLoading || (!append && page === 1 && !hasMore)) return;
    
    set({ isLoading: true });
    try {
      const response = await apiClient.getProjects({ 
        page, 
        limit: 20, 
        status: filters.status,
        search: filters.search 
      });
      
      if (response.success) {
        const newProjects = response.data || [];
        set({
          projects: append ? [...get().projects, ...newProjects] : newProjects,
          total: response.pagination?.total || 0,
          page,
          hasMore: newProjects.length === 20,
          isLoading: false,
        });
      } else {
        toast.error(response.error || 'Failed to fetch projects');
        set({ isLoading: false });
      }
    } catch (error) {
      toast.error('Failed to fetch projects');
      set({ isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.createProject({
        name: data.get('name') as string,
        description: data.get('description') as string,
        deadline: data.get('deadline') as string,
        status: data.get('status') as string,
      });
      
      if (response.success) {
        toast.success(response.message || 'Project created successfully');
        await get().fetchProjects(1, false);
        return { success: true };
      }
      toast.error(response.error || 'Failed to create project');
      return { success: false, error: response.error };
    } catch (error) {
      toast.error('Failed to create project');
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.updateProject(id, {
        name: data.get('name') as string,
        description: data.get('description') as string,
        deadline: data.get('deadline') as string,
        status: data.get('status') as string,
      });
      
      if (response.success) {
        toast.success(response.message || 'Project updated successfully');
        await get().fetchProjects(1, false);
        return { success: true };
      }
      toast.error(response.error || 'Failed to update project');
      return { success: false, error: response.error };
    } catch (error) {
      toast.error('Failed to update project');
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.deleteProject(id);
      if (response.success) {
        toast.success(response.message || 'Project deleted successfully');
        await get().fetchProjects(1, false);
        return { success: true };
      }
      toast.error(response.error || 'Failed to delete project');
      return { success: false, error: response.error };
    } catch (error) {
      toast.error('Failed to delete project');
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  setFilters: (filters) => {
    set({ filters, page: 1, projects: [] });
    get().fetchProjects(1, false);
  },

  clearFilters: () => {
    set({ filters: {}, page: 1, projects: [] });
    get().fetchProjects(1, false);
  },
}));

// Helper hook for single project
export function useProject(projectId: string) {
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getProject(projectId);
      if (response.success) {
        setProject(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { project, isLoading, refetch: fetchProject };
}

import { useState, useEffect } from 'react';