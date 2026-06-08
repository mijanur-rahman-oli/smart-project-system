// src/app/api/route.ts - API root with documentation
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'ProjectFlow API',
    version: '1.0.0',
    description: 'Project Management & Collaboration Platform API',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      projects: '/api/projects',
      tasks: '/api/tasks',
      comments: '/api/comments',
      attachments: '/api/attachments',
      notifications: '/api/notifications',
      analytics: '/api/analytics',
      search: '/api/search',
    },
  });
}