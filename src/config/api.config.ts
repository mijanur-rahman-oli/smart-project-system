// src/config/api.config.ts
export const apiConfig = {
  // API version
  version: 'v1',
  
  // Base URLs
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
  
  // Timeouts
  timeout: 30000, // 30 seconds
  retryDelay: 1000, // 1 second
  maxRetries: 3,
  
  // Headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Caching
  cache: {
    ttl: 5 * 60, // 5 minutes
    staleTime: 60, // 1 minute
  },
  
  // Rate limiting
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  
  // File upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json',
    ],
  },
  
  // WebSocket
  websocket: {
    reconnectAttempts: 5,
    reconnectDelay: 3000, // 3 seconds
    heartbeatInterval: 30000, // 30 seconds
  },
  
  // Authentication
  auth: {
    tokenKey: 'auth-token',
    refreshKey: 'refresh-token',
    tokenExpiry: 7 * 24 * 60 * 60, // 7 days
  },
  
  // Error messages
  errors: {
    network: 'Network error. Please check your connection.',
    server: 'Server error. Please try again later.',
    unauthorized: 'You are not authorized to perform this action.',
    forbidden: 'Access denied.',
    notFound: 'Resource not found.',
    validation: 'Validation error. Please check your input.',
    rateLimit: 'Too many requests. Please try again later.',
  },
  
  // Status codes
  statusCodes: {
    ok: 200,
    created: 201,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    tooManyRequests: 429,
    serverError: 500,
  },
  
  // Query keys for React Query
  queryKeys: {
    user: 'user',
    users: 'users',
    project: 'project',
    projects: 'projects',
    task: 'task',
    tasks: 'tasks',
    comments: 'comments',
    notifications: 'notifications',
    analytics: 'analytics',
    search: 'search',
  },
};

export type ApiConfig = typeof apiConfig;

// Helper function to build API URLs
export function buildApiUrl(path: string, params?: Record<string, any>): string {
  const url = `${apiConfig.baseUrl}${path}`;
  if (!params) return url;
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

// Helper function to handle API errors
export function getErrorMessage(error: any): string {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.message) {
    return error.message;
  }
  return apiConfig.errors.server;
}

// Helper function to check if error is retryable
export function isRetryableError(error: any): boolean {
  const status = error?.response?.status;
  return status === 408 || status === 429 || status >= 500;
}