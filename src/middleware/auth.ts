// src/server/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, refreshToken } from '@/lib/auth/session';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/demo',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/docs',
  '/api/docs/openapi.json',
];

const STATIC_ASSETS = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/icons',
];

export async function authMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Allow static assets
  if (STATIC_ASSETS.some(asset => path.startsWith(asset))) {
    return NextResponse.next();
  }
  
  // Allow public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }
  
  const session = await getSession();
  
  // Handle API routes
  if (path.startsWith('/api')) {
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }
  
  // Handle protected pages
  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }
  
  // Token refresh for near-expiry tokens
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    const newToken = await refreshToken(token);
    if (newToken) {
      const response = NextResponse.next();
      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
      return response;
    }
  }
  
  return NextResponse.next();
}

export function withAuth(handler: Function) {
  return async (request: NextRequest) => {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) return authResponse;
    return handler(request);
  };
}

export function optionalAuth(handler: Function) {
  return async (request: NextRequest) => {
    // Allow request even without auth, but session may be available
    return handler(request);
  };
}