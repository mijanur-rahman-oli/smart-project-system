// src/lib/api/errors.ts
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }

  static badRequest(message: string, code: string = 'BAD_REQUEST') {
    return new ApiError(message, 400, code);
  }

  static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    return new ApiError(message, 401, code);
  }

  static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    return new ApiError(message, 403, code);
  }

  static notFound(message: string = 'Not Found', code: string = 'NOT_FOUND') {
    return new ApiError(message, 404, code);
  }

  static conflict(message: string, code: string = 'CONFLICT') {
    return new ApiError(message, 409, code);
  }

  static tooManyRequests(message: string = 'Too Many Requests', code: string = 'RATE_LIMITED') {
    return new ApiError(message, 429, code);
  }

  static internal(message: string = 'Internal Server Error', code: string = 'INTERNAL_ERROR') {
    return new ApiError(message, 500, code);
  }

  static validation(errors: any[], code: string = 'VALIDATION_ERROR') {
    const message = 'Validation failed';
    const error = new ApiError(message, 400, code);
    (error as any).details = errors;
    return error;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}