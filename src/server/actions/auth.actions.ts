// src/server/actions/auth.actions.ts
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { signJWT } from '@/lib/auth/jwt';
import { loginSchema, registerSchema } from '@/lib/validations/auth.schema';

export async function loginAction(formData: FormData) {
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    rememberMe: formData.get('rememberMe') === 'true',
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.errors[0].message };
  }

  const { email, password, rememberMe } = validatedFields.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    return { error: 'Invalid credentials' };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: 'Invalid credentials' };
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate token
  const token = await signJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const maxAge = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24;
  
  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  // Redirect to dashboard
  redirect('/dashboard');
}

export async function registerAction(formData: FormData) {
  const validatedFields = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    agreeToTerms: formData.get('agreeToTerms') === 'true',
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.errors[0].message };
  }

  const { name, email, password } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: 'Email already registered' };
  }

  const hashedPassword = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashedPassword,
      role: 'team_member',
      isActive: true,
    },
  });

  redirect('/login?registered=true');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  redirect('/login');
}

export async function demoLoginAction(role: 'admin' | 'project_manager' | 'team_member') {
  const demoAccounts = {
    admin: { email: 'admin@demo.com', name: 'Demo Admin', role: 'admin' },
    project_manager: { email: 'manager@demo.com', name: 'Demo Manager', role: 'project_manager' },
    team_member: { email: 'member@demo.com', name: 'Demo Member', role: 'team_member' },
  };

  const demoAccount = demoAccounts[role];
  
  let user = await prisma.user.findUnique({
    where: { email: demoAccount.email },
  });

  if (!user) {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('Demo123!', 10);
    
    user = await prisma.user.create({
      data: {
        email: demoAccount.email,
        name: demoAccount.name,
        passwordHash: hashedPassword,
        role: demoAccount.role,
        isActive: true,
      },
    });
  }

  const token = await signJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 2,
    path: '/',
  });

  redirect('/dashboard');
}