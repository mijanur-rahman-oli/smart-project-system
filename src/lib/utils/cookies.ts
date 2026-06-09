// src/lib/utils/cookies.ts
import { cookies } from 'next/headers';

export async function setCookie(name: string, value: string, options?: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
  path?: string;
}) {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...options,
  });
}

export async function getCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function deleteCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}

export async function hasCookie(name: string): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(name);
}