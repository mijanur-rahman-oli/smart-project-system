// src/app/api/search/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';

const suggestionSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

// GET /api/search/suggestions - Get search suggestions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const { q, limit } = suggestionSchema.parse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
    });

    const suggestions = new Set<string>();

    // Get project name suggestions
    const projects = await prisma.project.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      take: limit,
      select: { name: true },
    });
    projects.forEach(p => suggestions.add(p.name));

    // Get task title suggestions
    const tasks = await prisma.task.findMany({
      where: {
        title: { contains: q, mode: 'insensitive' },
      },
      take: limit,
      select: { title: true },
    });
    tasks.forEach(t => suggestions.add(t.title));

    // Get user name suggestions
    const users = await prisma.user.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      take: limit,
      select: { name: true },
    });
    users.forEach(u => suggestions.add(u.name));

    // Get recent searches from history
    const recentSearches = await prisma.searchHistory.findMany({
      where: {
        userId: user.id,
        query: { contains: q, mode: 'insensitive' },
      },
      orderBy: { searchedAt: 'desc' },
      take: limit,
      distinct: ['query'],
      select: { query: true },
    });
    recentSearches.forEach(s => suggestions.add(s.query));

    return NextResponse.json({
      success: true,
      data: Array.from(suggestions).slice(0, limit),
    });
  } catch (error) {
    console.error('GET /api/search/suggestions error:', error);
    
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