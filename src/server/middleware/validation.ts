// src/server/middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export function validateBody(schema: z.ZodSchema) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validated = schema.parse(body);
      request.body = validated;
      return NextResponse.next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: error.errors[0].message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return async (request: NextRequest) => {
    try {
      const searchParams = Object.fromEntries(request.nextUrl.searchParams);
      const validated = schema.parse(searchParams);
      request.query = validated;
      return NextResponse.next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: error.errors[0].message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }
  };
}