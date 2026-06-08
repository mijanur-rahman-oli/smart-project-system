// src/types/api.types.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

// WebSocket events
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface TypingEvent {
  userId: string;
  userName: string;
  taskId: string;
  isTyping: boolean;
}

export interface TaskUpdateEvent {
  taskId: string;
  updates: Record<string, any>;
  updatedBy: {
    id: string;
    name: string;
  };
  timestamp: string;
}

export interface CommentEvent {
  commentId: string;
  taskId: string;
  content: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  timestamp: string;
}