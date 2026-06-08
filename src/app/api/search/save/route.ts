// src/app/api/search/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/session';

const saveSearchSchema = z.object({
  name: z.string().min(1).max(100),
  query: z.string().min(1),
  filters: z.any().optional(),
});

// POST /api/search/save - Save a search
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, query, filters } = saveSearchSchema.parse(body);

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name,
        query,
        filters: filters || {},
      },
    });

    return NextResponse.json({
      success: true,
      data: savedSearch,
      message: 'Search saved successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/search/save error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A saved search with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/search/save - Get saved searches
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: savedSearches,
    });
  } catch (error) {
    console.error('GET /api/search/save error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/search/save - Delete a saved search
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Search ID is required' },
        { status: 400 }
      );
    }

    await prisma.savedSearch.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Saved search deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/search/save error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}