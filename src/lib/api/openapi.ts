// src/lib/api/openapi.ts
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ProjectFlow API',
    version: '1.0.0',
    description: 'Smart Project Collaboration Platform API',
    contact: { name: 'API Support', email: 'support@projectflow.com' },
  },
  servers: [{ url: process.env.NEXT_PUBLIC_APP_URL + '/api', description: 'API Server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'auth-token' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'project_manager', 'team_member'] },
          avatarUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'completed', 'on_hold'] },
          deadline: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          dueDate: { type: 'string', format: 'date-time' },
          projectId: { type: 'string', format: 'cuid' },
          assignedTo: { type: 'string', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: { type: 'string' },
          code: { type: 'string' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'object' },
          message: { type: 'string' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'array' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  rememberMe: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'completed', 'on_hold'] } },
        ],
        responses: { 200: { description: 'List of projects' } },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create project',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'deadline'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  deadline: { type: 'string', format: 'date-time' },
                  status: { type: 'string', enum: ['active', 'completed', 'on_hold'] },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Project created' } },
      },
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'completed'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['high', 'medium', 'low'] } },
          { name: 'assignedTo', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'List of tasks' } },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create task',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'title', 'dueDate'],
                properties: {
                  projectId: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  assignedTo: { type: 'string' },
                  dueDate: { type: 'string', format: 'date-time' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Task created' } },
      },
    },
  },
};