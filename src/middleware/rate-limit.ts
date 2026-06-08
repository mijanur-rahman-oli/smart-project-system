// src/server/middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: 'rate-limit',
};

export async function rateLimitMiddleware(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {}
) {
  const { windowMs, maxRequests, keyPrefix } = { ...defaultConfig, ...config };
  
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const path = request.nextUrl.pathname;
  const key = `${keyPrefix}:${ip}:${path}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }

  const remaining = Math.max(0, maxRequests - current);

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000)));

  if (current > maxRequests) {
    return NextResponse.json(
      { success: false, error: 'Too many requests, please try again later' },
      { status: 429, headers: response.headers }
    );
  }

  return response;
}

export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  return (request: NextRequest) => rateLimitMiddleware(request, config);
}

// Specific rate limiters for different endpoints
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'strict-limit',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'auth-limit',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 50,
  keyPrefix: 'api-limit',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'upload-limit',
});