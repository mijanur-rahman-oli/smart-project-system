// src/types/index.ts
export * from './project.types';
export * from './task.types';
export * from './user.types';
export * from './api.types';
export * from './notification.types';

// Common utility types
export type ID = string;
export type Timestamp = Date;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SearchParams extends PaginationParams {
  q?: string;
}

// Component Props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  loading?: boolean;
  skeleton?: React.ReactNode;
}

export interface ErrorProps extends BaseComponentProps {
  error?: Error | string | null;
  onRetry?: () => void;
}