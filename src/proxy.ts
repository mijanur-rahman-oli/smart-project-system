// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/demo'];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Allow public paths
  if (publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }
  
  // Get auth token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  
  // Check for API routes
  if (path.startsWith('/api')) {
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }
  
  // Check for protected pages
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};