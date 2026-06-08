// tests/unit/utils/helpers.test.ts
import { formatDate, truncateText, getInitials, cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date in short format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'short')).toBe('Jan 15, 2024');
    });
    
    it('should format date in long format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'long')).toContain('Monday');
      expect(formatDate(date, 'long')).toContain('January');
    });
    
    it('should return relative time for recent dates', () => {
      const date = new Date();
      date.setMinutes(date.getMinutes() - 5);
      expect(formatDate(date, 'relative')).toBe('5m ago');
    });
    
    it('should handle invalid date', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
    });
  });
  
  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(150);
      expect(truncateText(longText, 100)).toHaveLength(103); // 100 + '...'
      expect(truncateText(longText, 100)).toEndWith('...');
    });
    
    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 100)).toBe(shortText);
    });
    
    it('should handle empty string', () => {
      expect(truncateText('', 100)).toBe('');
    });
  });
  
  describe('getInitials', () => {
    it('should return initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Jane Smith Johnson')).toBe('JS');
    });
    
    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });
    
    it('should handle empty string', () => {
      expect(getInitials('')).toBe('');
    });
  });
  
  describe('cn (classNames)', () => {
    it('should merge class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });
    
    it('should handle conditional classes', () => {
      expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
    });
    
    it('should handle objects', () => {
      expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3');
    });
    
    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
  });
});