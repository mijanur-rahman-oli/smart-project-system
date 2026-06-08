import supertest from 'supertest';
import { app } from '@/app';

let server: any;

export function createTestClient() {
  if (!server) {
    server = supertest(app);
  }
  return server;
}

export async function authenticatedClient(userToken: string) {
  const client = createTestClient();
  
  return {
    get: (url: string) => client.get(url).set('Authorization', `Bearer ${userToken}`),
    post: (url: string, data: any) => client.post(url).send(data).set('Authorization', `Bearer ${userToken}`),
    put: (url: string, data: any) => client.put(url).send(data).set('Authorization', `Bearer ${userToken}`),
    patch: (url: string, data: any) => client.patch(url).send(data).set('Authorization', `Bearer ${userToken}`),
    delete: (url: string) => client.delete(url).set('Authorization', `Bearer ${userToken}`),
  };
}

export async function loginAndGetToken(email: string, password: string) {
  const client = createTestClient();
  const response = await client
    .post('/api/auth/login')
    .send({ email, password });
  
  return response.body.data.token;
}

// Test API response helper
export function expectSuccessResponse(response: any) {
  expect(response.body.success).toBe(true);
  expect(response.body.error).toBeUndefined();
}

export function expectErrorResponse(response: any, expectedStatus: number, expectedError?: string) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  if (expectedError) {
    expect(response.body.error).toContain(expectedError);
  }
}

export function expectPaginatedResponse(response: any) {
  expect(response.body.pagination).toBeDefined();
  expect(response.body.pagination.page).toBeDefined();
  expect(response.body.pagination.limit).toBeDefined();
  expect(response.body.pagination.total).toBeDefined();
  expect(response.body.pagination.totalPages).toBeDefined();
}