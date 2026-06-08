// src/lib/cache/redis.ts
import { redis } from '@/lib/db/redis';

export interface CacheOptions {
  ttl?: number;
  key?: string;
}

export class CacheManager {
  private static instance: CacheManager;
  private defaultTTL = 300; // 5 minutes

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  }

  async increment(key: string, by: number = 1): Promise<number> {
    return redis.incrby(key, by);
  }

  async expire(key: string, ttl: number): Promise<void> {
    await redis.expire(key, ttl);
  }

  async flushAll(): Promise<void> {
    await redis.flushall();
  }

  // Cache wrapper for functions
  async withCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  // Rate limiting
  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
  }> {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    const ttl = await redis.ttl(key);
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      reset: Math.floor(Date.now() / 1000) + ttl,
    };
  }
}

export const cache = CacheManager.getInstance();