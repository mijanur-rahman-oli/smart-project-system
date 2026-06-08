// src/lib/api/openapi.ts
export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ProjectFlow API',
    version: '1.0.0',
    description: 'REST API for ProjectFlow - Smart Project Collaboration Platform',
    contact: {
      name: 'API Support',
      email: 'support@projectflow.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.projectflow.com/v1',
      description: 'Production server',
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: