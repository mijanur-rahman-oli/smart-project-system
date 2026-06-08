// src/app/api/auth/demo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { signJWT } from '@/lib/auth/jwt';
import { logActivity } from '@/server/services/activity.service';

const demoSchema = z.object({
  role: z.enum(['admin', 'project_manager', 'team_member']),
});

const demoAccounts = {
  admin: {
    email: 'admin@demo.com',
    name: 'Demo Admin',
    role: 'admin',
  },
  project_manager: {
    email: 'manager@demo.com',
    name: 'Demo Manager',
    role: 'project_manager',
  },
  team_member: {
    email: 'member@demo.com',
    name: 'Demo Member',
    role: 'team_member',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role } = demoSchema.parse(body);

    const demoAccount = demoAccounts[role];
    
    let user = await prisma.user.findUnique({
      where: { email: demoAccount.email },
    });

    // Create demo user if not exists (for first-time setup)
    if (!user) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('Demo123!', 10);
      
      user = await prisma.user.create({
        data: {
          email: demoAccount.email,
          name: demoAccount.name,
          passwordHash: hashedPassword,
          role: demoAccount.role,
          isActive: true,
        },
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: 'DEMO_LOGIN',
      entityType: 'user',
      entityId: user.id,
      metadata: {
        role: demoAccount.role,
        timestamp: new Date().toISOString(),
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      message: `Logged in as ${demoAccount.name}`,
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2, // 2 hours for demo
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Demo login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}