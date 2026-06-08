// src/lib/api/response.ts
export class APIResponse {
  static success<T>(data: T, message?: string, meta?: any) {
    return {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, code?: string, details?: any, statusCode?: number) {
    return {
      success: false,
      error: {
        message,
        code: code || 'INTERNAL_ERROR',
        details,
        statusCode: statusCode || 500,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static paginated<T>(data: T[], total: number, page: number, limit: number) {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }
}