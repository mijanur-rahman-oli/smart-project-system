// src/lib/auth/session.ts
import { cookies } from 'next/headers';
import { verifyJWT, JWTPayload } from './jwt';
import { prisma } from '@/lib/db/prisma';

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  
  try {
    return await verifyJWT(token);
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
    },
  });
  
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { createdBy: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  return !!project;
}

export async function requireRole(roles: string[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}