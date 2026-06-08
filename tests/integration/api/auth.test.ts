// tests/integration/api/auth.test.ts
import { createTestClient, expectSuccessResponse, expectErrorResponse } from '@/tests/utils/test-client';
import { createMockUser, cleanupTestData } from '@/tests/utils/test-data';

describe('Authentication API Integration', () => {
  let client: any;
  
  beforeAll(() => {
    client = createTestClient();
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await client
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'Test123!',
          confirmPassword: 'Test123!',
        });
      
      expectSuccessResponse(response);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@test.com');
      expect(response.body.data.user.name).toBe('Test User');
    });
    
    it('should reject duplicate email registration', async () => {
      // First registration
      await client.post('/api/auth/register').send({
        name: 'User 1',
        email: 'duplicate@test.com',
        password: 'Test123!',
        confirmPassword: 'Test123!',
      });
      
      // Duplicate registration
      const response = await client
        .post('/api/auth/register')
        .send({
          name: 'User 2',
          email: 'duplicate@test.com',
          password: 'Test123!',
          confirmPassword: 'Test123!',
        });
      
      expectErrorResponse(response, 409, 'Email already registered');
    });
    
    it('should reject invalid password format', async () => {
      const response = await client
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test2@test.com',
          password: 'weak',
          confirmPassword: 'weak',
        });
      
      expectErrorResponse(response, 400);
    });
    
    it('should reject mismatched passwords', async () => {
      const response = await client
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test3@test.com',
          password: 'Test123!',
          confirmPassword: 'Different123!',
        });
      
      expectErrorResponse(response, 400, 'Passwords do not match');
    });
  });
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await client.post('/api/auth/register').send({
        name: 'Login User',
        email: 'login@test.com',
        password: 'Test123!',
        confirmPassword: 'Test123!',
      });
    });
    
    it('should login with valid credentials', async () => {
      const response = await client
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Test123!',
        });
      
      expectSuccessResponse(response);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });
    
    it('should reject invalid password', async () => {
      const response = await client
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword123!',
        });
      
      expectErrorResponse(response, 401, 'Invalid credentials');
    });
    
    it('should reject non-existent email', async () => {
      const response = await client
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Test123!',
        });
      
      expectErrorResponse(response, 401, 'Invalid credentials');
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const loginResponse = await client
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Test123!',
        });
      
      const token = loginResponse.body.data.token;
      
      const response = await client
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      
      expectSuccessResponse(response);
    });
  });
});