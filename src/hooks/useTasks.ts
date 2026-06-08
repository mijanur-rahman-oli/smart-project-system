// src/hooks/useTasks.ts
'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  assignee: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  project: { id: string; name: string };
  _count: { comments: number; attachments: number };
}

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  total: number;
  page: number;
  hasMore: boolean;
  filters: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    projectId?: string;
    search?: string;
  };
  fetchTasks: (page?: number, append?: boolean) => Promise<void>;
  createTask: (data: FormData) => Promise<{ success: boolean; error?: string }>;
  updateTask: (id: string, data: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteTask: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateTaskStatus: (id: string, status: string) => Promise<{ success: boolean; error?: string }>;
  setFilters: (filters: Partial<TasksState['filters']>) => void;
  clearFilters: () => void;
}

export const useTasks = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  total: 0,
  page: 1,
  hasMore: true,
  filters: {},

  fetchTasks: async (page = 1, append = false) => {
    const { filters, isLoading, hasMore } = get();
    if (isLoading || (!append && page === 1 && !hasMore)) return;
    
    set({ isLoading: true });
    try {
      const response = await apiClient.getTasks({ 
        page, 
        limit: 20, 
        ...filters 
      });
      
      if (response.success) {
        const newTasks = response.data || [];
        set({
          tasks: append ? [...get().tasks, ...newTasks] : newTasks,
          total: response.pagination?.total || 0,
          page,
          hasMore: newTasks.length === 20,
          isLoading: false,
        });
      } else {
        toast.error(response.error || 'Failed to fetch tasks');
        set({ isLoading: false });
      }
    } catch (error) {
      toast.error('Failed to fetch tasks');
      set({ isLoading: false });
    }
  },

  createTask: async (data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.createTask({
        projectId: data.get('projectId') as string,
        title: data.get('title') as string,
        description: data.get('description') as string,
        assignedTo: data.get('assignedTo') as string,
        dueDate: data.get('dueDate') as string,
        priority: data.get('priority') as string,
      });
      
      if (response.success) {
        toast.success(response.message || 'Task created successfully');
        await get().fetchTasks(1, false);
        return { success: true };
      }
      toast.error(response.error || 'Failed to create task');
      return { success: false, error: response.error };
    } catch (error) {
      toast.error('Failed to create task');
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.updateTask(id, {
        title: data.get('title') as string,
        description: data.get('description') as string,
        assignedTo: data.get('assignedTo') as string,
        dueDate: data.get('dueDate') as string,
        priority: data.get('priority') as string,
        status: data.get('status') as string,
      });
      
      if (response.success) {
        toast.success(response.message || 'Task updated successfully');
        await get().fetchTasks(1, false);
        return { success: true };
      }
      toast.error(response.error || 'Failed to update task');
      return { success: false, error: response.error };
    } catch (error) {
      toast.error('Failed to update task');
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.deleteTask(id);
      if (response.success) {
        toast.success(response.message || 'Task deleted successfully');
        await get().fetchTasks(1, false);
        return { success: true };
      }
      toast.error(response.error || 'Failed to delete task');
      return { success: false, error: response.error };
    } catch (error) {
      toast.error('Failed to delete task');
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  updateTaskStatus: async (id, status) => {
    try {
      const response = await apiClient.updateTaskStatus(id, status);
      if (response.success) {
        toast.success(response.message || 'Task status updated');
        await get().fetchTasks(1, false);
        return { success: true };
      }
      toast.error(response.error || 'Failed to update task status');
      return { success: false, error: response.error };
    } catch (error) {
      toast.error('Failed to update task status');
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters }, page: 1, tasks: [] });
    get().fetchTasks(1, false);
  },

  clearFilters: () => {
    set({ filters: {}, page: 1, tasks: [] });
    get().fetchTasks(1, false);
  },
}));

// Helper hook for single task
export function useTask(taskId: string) {
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getTask(taskId);
      if (response.success) {
        setTask(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { task, isLoading, refetch: fetchTask };
}