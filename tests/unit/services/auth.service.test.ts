// tests/unit/services/auth.service.test.ts
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  refreshToken,
  changePassword,
  resetPassword,
  verifyEmail 
} from '@/server/services/auth.service';
import { signJWT, verifyJWT } from '@/lib/auth/jwt';
import { logActivity } from '@/server/services/activity.service';

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('@/lib/auth/jwt', () => ({
  signJWT: jest.fn(),
  verifyJWT: jest.fn(),
}));

jest.mock('@/server/services/activity.service', () => ({
  logActivity: jest.fn(),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#',
    };

    it('should register a new user successfully', async () => {
      // Mock no existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Mock password hashing
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      
      // Mock user creation
      const mockUser = {
        id: 'user-123',
        email: validUserData.email,
        name: validUserData.name,
        role: 'team_member',
        isActive: true,
        createdAt: new Date(),
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      
      // Mock JWT sign
      (signJWT as jest.Mock).mockResolvedValue('mock_jwt_token');
      
      const result = await registerUser(validUserData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.user.email).toBe(validUserData.email);
      expect(result.data.token).toBe('mock_jwt_token');
      expect(logActivity).toHaveBeenCalled();
    });

    it('should reject duplicate email registration', async () => {
      // Mock existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: validUserData.email,
      });
      
      const result = await registerUser(validUserData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject weak password', async () => {
      const weakPasswordData = {
        ...validUserData,
        password: 'weak',
        confirmPassword: 'weak',
      };
      
      const result = await registerUser(weakPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });

    it('should reject mismatched passwords', async () => {
      const mismatchedData = {
        ...validUserData,
        confirmPassword: 'Different123!',
      };
      
      const result = await registerUser(mismatchedData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });

    it('should reject invalid email format', async () => {
      const invalidEmailData = {
        ...validUserData,
        email: 'invalid-email',
      };
      
      const result = await registerUser(invalidEmailData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('should hash password with correct salt rounds', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'user-123', email: validUserData.email });
      (signJWT as jest.Mock).mockResolvedValue('token');
      
      await registerUser(validUserData);
      
      expect(bcrypt.hash).toHaveBeenCalledWith(validUserData.password, 12);
    });
  });

  describe('loginUser', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: validCredentials.email,
        name: 'Test User',
        role: 'team_member',
        passwordHash: 'hashed_password',
        isActive: true,
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (signJWT as jest.Mock).mockResolvedValue('mock_jwt_token');
      
      const result = await loginUser(validCredentials.email, validCredentials.password);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.user.email).toBe(validCredentials.email);
      expect(result.data.token).toBe('mock_jwt_token');
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_LOGIN',
      }));
    });

    it('should reject invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await loginUser(validCredentials.email, validCredentials.password);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: validCredentials.email,
        passwordHash: 'hashed_password',
        isActive: true,
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      const result = await loginUser(validCredentials.email, validCredentials.password);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: validCredentials.email,
        passwordHash: 'hashed_password',
        isActive: false,
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await loginUser(validCredentials.email, validCredentials.password);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
    });

    it('should update last login timestamp', async () => {
      const mockUser = {
        id: 'user-123',
        email: validCredentials.email,
        passwordHash: 'hashed_password',
        isActive: true,
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (signJWT as jest.Mock).mockResolvedValue('token');
      
      await loginUser(validCredentials.email, validCredentials.password);
      
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      });
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const passwords = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
      confirmNewPassword: 'NewPass123!',
    };

    it('should change password successfully', async () => {
      const mockUser = {
        id: userId,
        passwordHash: 'old_hashed_password',
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      
      const result = await changePassword(userId, passwords);
      
      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'new_hashed_password' },
      });
      expect(logActivity).toHaveBeenCalled();
    });

    it('should reject incorrect current password', async () => {
      const mockUser = {
        id: userId,
        passwordHash: 'old_hashed_password',
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      const result = await changePassword(userId, passwords);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should reject mismatched new passwords', async () => {
      const mismatchedPasswords = {
        ...passwords,
        confirmNewPassword: 'Different123!',
      };
      
      const result = await changePassword(userId, mismatchedPasswords);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('New passwords do not match');
    });

    it('should reject weak new password', async () => {
      const weakPasswords = {
        ...passwords,
        newPassword: 'weak',
        confirmNewPassword: 'weak',
      };
      
      const result = await changePassword(userId, weakPasswords);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });

    it('should prevent same password', async () => {
      const samePasswords = {
        ...passwords,
        newPassword: 'OldPass123!',
        confirmNewPassword: 'OldPass123!',
      };
      
      const result = await changePassword(userId, samePasswords);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('New password must be different from current password');
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const newPassword = 'NewPass123!';

    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        resetToken: resetToken,
        resetTokenExpiry: new Date(Date.now() + 3600000),
      };
      
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      
      const result = await resetPassword(resetToken, newPassword);
      
      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: 'new_hashed_password',
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    });

    it('should reject invalid token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      
      const result = await resetPassword(resetToken, newPassword);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });

    it('should reject expired token', async () => {
      const mockUser = {
        id: 'user-123',
        resetToken: resetToken,
        resetTokenExpiry: new Date(Date.now() - 3600000),
      };
      
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await resetPassword(resetToken, newPassword);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const oldToken = 'old_valid_token';
      const decodedToken = { userId: 'user-123', email: 'test@example.com', role: 'team_member' };
      
      (verifyJWT as jest.Mock).mockResolvedValue(decodedToken);
      (signJWT as jest.Mock).mockResolvedValue('new_jwt_token');
      
      const result = await refreshToken(oldToken);
      
      expect(result.success).toBe(true);
      expect(result.data.token).toBe('new_jwt_token');
    });

    it('should reject invalid token', async () => {
      (verifyJWT as jest.Mock).mockRejectedValue(new Error('Invalid token'));
      
      const result = await refreshToken('invalid_token');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });
  });

  describe('verifyEmail', () => {
    const verificationToken = 'valid-verification-token';

    it('should verify email successfully', async () => {
      const mockUser = {
        id: 'user-123',
        emailVerificationToken: verificationToken,
        emailVerified: false,
      };
      
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await verifyEmail(verificationToken);
      
      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
        },
      });
    });

    it('should reject invalid verification token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      
      const result = await verifyEmail(verificationToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification token');
    });
  });

  describe('logoutUser', () => {
    it('should logout user successfully', async () => {
      const userId = 'user-123';
      
      const result = await logoutUser(userId);
      
      expect(result.success).toBe(true);
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        action: 'USER_LOGOUT',
      }));
    });
  });
});