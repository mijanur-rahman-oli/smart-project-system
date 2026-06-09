// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the token
    let payload;
    try {
      payload = await verifyJWT(token);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
      },
    });
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}