// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { logActivity } from '@/server/services/activity.service';

export async function POST() {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      await logActivity({
        userId: user.id,
        action: 'USER_LOGOUT',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.delete('auth-token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}