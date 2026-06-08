// src/server/middleware/rbac.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission, Permission } from '@/lib/auth/rbac';

export async function requirePermission(permission: Permission) {
  return async (request: NextRequest) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.role as any, permission)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.next();
  };
}

export async function requireRole(roles: string[]) {
  return async (request: NextRequest) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!roles.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.next();
  };
}

export async function requireProjectAccess(projectId: string) {
  return async (request: NextRequest) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role === 'admin') {
      return NextResponse.next();
    }

    const { prisma } = await import('@/lib/db/prisma');
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: session.userId },
          { members: { some: { userId: session.userId } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.next();
  };
}