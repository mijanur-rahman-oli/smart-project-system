// src/lib/api/response.ts
import { NextResponse } from 'next/server';
import { ApiError } from './errors';

export class ApiResponse {
  static success<T>(data: T, message?: string, status: number = 200) {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
      },
      { status }
    );
  }

  static paginated<T>(data: T[], pagination: { page: number; limit: number; total: number }) {
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  }

  static error(error: Error | ApiError | string, status: number = 500) {
    const message = error instanceof Error ? error.message : error;
    const code = error instanceof ApiError ? error.code : 'ERROR';

    return NextResponse.json(
      {
        success: false,
        error: message,
        code,
      },
      { status }
    );
  }

  static validation(errors: any[]) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
      { status: 400 }
    );
  }

  static unauthorized(message: string = 'Unauthorized') {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  static forbidden(message: string = 'Forbidden') {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'FORBIDDEN',
      },
      { status: 403 }
    );
  }

  static notFound(message: string = 'Not Found') {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'NOT_FOUND',
      },
      { status: 404 }
    );
  }

  static conflict(message: string) {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'CONFLICT',
      },
      { status: 409 }
    );
  }

  static created<T>(data: T, message?: string) {
    return this.success(data, message, 201);
  }

  static noContent() {
    return new NextResponse(null, { status: 204 });
  }
}