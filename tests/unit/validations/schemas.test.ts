// tests/unit/validations/schemas.test.ts
import { 
  createProjectSchema, 
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  createCommentSchema 
} from '@/lib/validations/api.schemas';

describe('Validation Schemas', () => {
  describe('createProjectSchema', () => {
    it('should validate valid project data', () => {
      const validData = {
        name: 'Test Project',
        description: 'Test Description',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        status: 'active',
      };
      
      const result = createProjectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject missing name', () => {
      const invalidData = {
        deadline: new Date().toISOString(),
      };
      
      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });
    
    it('should reject name shorter than 3 characters', () => {
      const invalidData = {
        name: 'ab',
        deadline: new Date().toISOString(),
      };
      
      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should reject past deadline', () => {
      const invalidData = {
        name: 'Test Project',
        deadline: new Date(Date.now() - 86400000).toISOString(),
      };
      
      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('createTaskSchema', () => {
    it('should validate valid task data', () => {
      const validData = {
        projectId: 'clxyz1234567890',
        title: 'Test Task',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        priority: 'high',
      };
      
      const result = createTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid projectId format', () => {
      const invalidData = {
        projectId: 'invalid-id',
        title: 'Test Task',
        dueDate: new Date().toISOString(),
      };
      
      const result = createTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should accept optional fields', () => {
      const validData = {
        projectId: 'clxyz1234567890',
        title: 'Test Task',
        dueDate: new Date().toISOString(),
      };
      
      const result = createTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
  
  describe('createCommentSchema', () => {
    it('should validate valid comment', () => {
      const validData = {
        taskId: 'clxyz1234567890',
        content: 'This is a test comment',
      };
      
      const result = createCommentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject empty content', () => {
      const invalidData = {
        taskId: 'clxyz1234567890',
        content: '',
      };
      
      const result = createCommentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should reject content exceeding 5000 chars', () => {
      const invalidData = {
        taskId: 'clxyz1234567890',
        content: 'a'.repeat(5001),
      };
      
      const result = createCommentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});