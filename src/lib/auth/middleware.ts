// src/lib/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './session';

const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/demo'];

export async function authMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Allow public paths
  if (publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }
  
  // Check for API routes
  if (path.startsWith('/api')) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  // Check for protected pages
  if (!path.startsWith('/api')) {
    const session = await getSession();
    if (!session) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

export function withAuth(handler: Function) {
  return async (request: NextRequest) => {
    const response = await authMiddleware(request);
    if (response.status !== 200) return response;
    return handler(request);
  };
}