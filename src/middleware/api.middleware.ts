// src/middleware/api.middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { API_CONFIG, APIError, ErrorCodes } from '@/lib/api/config';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(API_CONFIG.rateLimit.max, `${API_CONFIG.rateLimit.windowMs}ms`),
});

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new APIError(401, 'Authentication required', ErrorCodes.UNAUTHORIZED);
    }

    // Verify JWT token
    const user = await verifyToken(token);
    
    if (!user) {
      throw new APIError(401, 'Invalid or expired token', ErrorCodes.UNAUTHORIZED);
    }

    return await handler(req, user);
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function withRateLimit(req: NextRequest, handler: () => Promise<NextResponse>) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      APIResponse.error('Too many requests', ErrorCodes.RATE_LIMIT_EXCEEDED, {
        limit,
        reset: new Date(reset).toISOString(),
        remaining,
      }),
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  const response = await handler();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());
  
  return response;
}

export async function withValidation<T>(
  req: NextRequest,
  schema: any,
  handler: (data: T) => Promise<NextResponse>
) {
  try {
    const body = await req.json();
    const validated = await schema.parseAsync(body);
    return await handler(validated);
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        APIResponse.error('Validation failed', ErrorCodes.VALIDATION_ERROR, error.errors),
        { status: 400 }
      );
    }
    return handleAPIError(error);
  }
}

function handleAPIError(error: any) {
  if (error instanceof APIError) {
    return NextResponse.json(
      APIResponse.error(error.message, error.code, error.details),
      { status: error.statusCode }
    );
  }

  console.error('API Error:', error);
  return NextResponse.json(
    APIResponse.error('Internal server error', ErrorCodes.INTERNAL_ERROR),
    { status: 500 }
  );
}