// src/lib/api/client.ts
import { z } from 'zod';

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || '/api';
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  private async request<T>(
    endpoint: string,
    method: HTTPMethod = 'GET',
    data?: any,
    schema?: z.ZodType<T>
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: this.headers,
        credentials: 'include',
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'An error occurred',
        };
      }

      if (schema) {
        const validated = schema.safeParse(result.data);
        if (!validated.success) {
          return {
            success: false,
            error: 'Invalid response format',
          };
        }
        return {
          success: true,
          data: validated.data,
          message: result.message,
          pagination: result.pagination,
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', 'POST', { email, password });
  }

  async register(name: string, email: string, password: string) {
    return this.request('/auth/register', 'POST', { name, email, password });
  }

  async logout() {
    return this.request('/auth/logout', 'POST');
  }

  // Project endpoints
  async getProjects(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    
    const endpoint = query.toString() ? `/projects?${query}` : '/projects';
    return this.request(endpoint);
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
    deadline: string;
    status?: string;
  }) {
    return this.request('/projects', 'POST', data);
  }

  async updateProject(id: string, data: Partial<{
    name: string;
    description: string;
    deadline: string;
    status: string;
  }>) {
    return this.request(`/projects/${id}`, 'PUT', data);
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, 'DELETE');
  }

  // Task endpoints
  async getTasks(params?: {
    page?: number;
    limit?: number;
    projectId?: string;
    assignedTo?: string;
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.assignedTo) query.append('assignedTo', params.assignedTo);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.search) query.append('search', params.search);
    
    const endpoint = query.toString() ? `/tasks?${query}` : '/tasks';
    return this.request(endpoint);
  }

  async getTask(id: string) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: {
    projectId: string;
    title: string;
    description?: string;
    assignedTo?: string;
    dueDate: string;
    priority?: string;
  }) {
    return this.request('/tasks', 'POST', data);
  }

  async updateTask(id: string, data: Partial<{
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: string;
    status: string;
  }>) {
    return this.request(`/tasks/${id}`, 'PUT', data);
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, 'DELETE');
  }

  async updateTaskStatus(id: string, status: string) {
    return this.request(`/tasks/${id}/status`, 'PATCH', { status });
  }

  // Comment endpoints
  async getComments(taskId: string) {
    return this.request(`/comments?taskId=${taskId}`);
  }

  async createComment(data: {
    taskId: string;
    content: string;
    richContent?: any;
  }) {
    return this.request('/comments', 'POST', data);
  }

  async updateComment(id: string, data: {
    content: string;
    richContent?: any;
  }) {
    return this.request(`/comments/${id}`, 'PUT', data);
  }

  async deleteComment(id: string) {
    return this.request(`/comments/${id}`, 'DELETE');
  }

  // Notification endpoints
  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.append('unreadOnly', 'true');
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    
    const endpoint = query.toString() ? `/notifications?${query}` : '/notifications';
    return this.request(endpoint);
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, 'POST');
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', 'POST');
  }

  async getNotificationPreferences() {
    return this.request('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences: any[]) {
    return this.request('/notifications/preferences', 'PUT', { preferences });
  }

  // Analytics endpoints
  async getDashboardMetrics() {
    return this.request('/analytics/dashboard');
  }

  async getRealTimeMetrics() {
    return this.request('/analytics/realtime');
  }

  async getProjectAnalytics(projectId: string) {
    return this.request(`/analytics/projects/${projectId}`);
  }

  // Search endpoint
  async search(query: string, filters?: any) {
    return this.request('/search', 'POST', { query, filters });
  }

  async getSearchSuggestions(query: string) {
    return this.request(`/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // Upload endpoints
  async uploadFile(file: File, entityType: string, entityId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    
    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    return response.json();
  }

  async deleteFile(attachmentId: string) {
    return this.request(`/attachments/${attachmentId}`, 'DELETE');
  }
}

export const apiClient = new ApiClient();