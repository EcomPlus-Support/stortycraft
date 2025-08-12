import Redis from 'ioredis';
import type { CacheEntry, AspectRatio } from '@/app/types';
import { CacheError } from './errors';

// Cache configuration
interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultTtl: number;
  keyPrefix: string;
  compressionThreshold: number;
  enableCompression: boolean;
  enableStats: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTtl: 3600, // 1 hour
  keyPrefix: 'storycraft:',
  compressionThreshold: 1024, // 1KB
  enableCompression: true,
  enableStats: true,
};

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  keyCount: number;
  lastUpdated: string;
}

// Multi-level cache implementation
export class CacheManager {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    keyCount: 0,
    lastUpdated: new Date().toISOString(),
  };
  private config: CacheConfig;
  private memoryCacheMaxSize = 1000;
  private responseTimes: number[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeRedis();
    this.startPeriodicCleanup();
  }

  private initializeRedis() {
    if (this.config.redis) {
      try {
        this.redis = new Redis({
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.db || 0,
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
        });

        this.redis.on('error', (error) => {
          console.error('Redis connection error:', error);
          this.stats.errors++;
        });

        this.redis.on('connect', () => {
          console.log('Redis connected successfully');
        });
      } catch (error) {
        console.error('Failed to initialize Redis:', error);
        this.redis = null;
      }
    }
  }

  // Key generation utilities
  private generateKey(namespace: string, identifier: string, aspectRatio?: AspectRatio): string {
    const aspectRatioSuffix = aspectRatio ? `:ar:${aspectRatio.id}` : '';
    return `${this.config.keyPrefix}${namespace}:${identifier}${aspectRatioSuffix}`;
  }

  generateImageKey(prompt: string, aspectRatio: AspectRatio, characters?: any[]): string {
    const characterHash = characters ? this.hashObject(characters) : '';
    const promptHash = this.hashString(prompt);
    return this.generateKey('image', `${promptHash}:${characterHash}`, aspectRatio);
  }

  generateVideoKey(prompt: string, imageBase64: string, aspectRatio: AspectRatio): string {
    const imageHash = this.hashString(imageBase64);
    const promptHash = this.hashString(prompt);
    return this.generateKey('video', `${promptHash}:${imageHash}`, aspectRatio);
  }

  generateScenarioKey(scenario: any): string {
    const scenarioHash = this.hashObject(scenario);
    return this.generateKey('scenario', scenarioHash, scenario.aspectRatio);
  }

  // Hash utilities
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private hashObject(obj: any): string {
    return this.hashString(JSON.stringify(obj));
  }

  // Core cache operations
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Try memory cache first
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        this.recordHit(startTime);
        return memoryResult;
      }

      // Try Redis if available
      if (this.redis) {
        const redisResult = await this.getFromRedis<T>(key);
        if (redisResult !== null) {
          // Store in memory cache for faster access
          this.setInMemory(key, redisResult, this.config.defaultTtl);
          this.recordHit(startTime);
          return redisResult;
        }
      }

      this.recordMiss(startTime);
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache get error:', error);
      throw new CacheError(`Failed to get cache key: ${key}`, 'get', { key, error });
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.config.defaultTtl): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Store in memory cache
      this.setInMemory(key, value, ttl);

      // Store in Redis if available
      if (this.redis) {
        await this.setInRedis(key, value, ttl);
      }

      this.stats.sets++;
      this.recordResponseTime(startTime);
    } catch (error) {
      this.stats.errors++;
      console.error('Cache set error:', error);
      throw new CacheError(`Failed to set cache key: ${key}`, 'set', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Delete from memory cache
      this.memoryCache.delete(key);

      // Delete from Redis if available
      if (this.redis) {
        await this.redis.del(key);
      }

      this.stats.deletes++;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache delete error:', error);
      throw new CacheError(`Failed to delete cache key: ${key}`, 'delete', { key, error });
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear Redis if available
      if (this.redis) {
        await this.redis.flushdb();
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Cache clear error:', error);
      throw new CacheError('Failed to clear cache', 'clear', { error });
    }
  }

  // Memory cache operations
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > new Date(entry.createdAt).getTime() + entry.ttl * 1000) {
      this.memoryCache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.value as T;
  }

  private setInMemory<T>(key: string, value: T, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.memoryCacheMaxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    const entry: CacheEntry = {
      key,
      value,
      ttl,
      createdAt: new Date().toISOString(),
      hitCount: 0,
    };

    this.memoryCache.set(key, entry);
  }

  // Redis operations
  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const result = await this.redis.get(key);
      if (!result) return null;

      return JSON.parse(result) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  private async setInRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.redis) return;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  // Cache warming
  async warmCache(warmingTasks: Array<{ key: string; generator: () => Promise<any>; ttl?: number }>): Promise<void> {
    console.log(`Warming cache with ${warmingTasks.length} tasks`);
    
    const warmingPromises = warmingTasks.map(async (task) => {
      try {
        const cached = await this.get(task.key);
        if (cached === null) {
          const value = await task.generator();
          await this.set(task.key, value, task.ttl);
          console.log(`Warmed cache key: ${task.key}`);
        }
      } catch (error) {
        console.error(`Failed to warm cache key ${task.key}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
    console.log('Cache warming completed');
  }

  // Batch operations
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    // Use Promise.all for concurrent gets
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    });

    await Promise.all(promises);
    return results;
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.value, entry.ttl)
    );
    
    await Promise.all(promises);
  }

  // Aspect ratio specific operations
  async getByAspectRatio<T>(namespace: string, aspectRatio: AspectRatio): Promise<Map<string, T>> {
    const pattern = this.generateKey(namespace, '*', aspectRatio);
    return this.getByPattern<T>(pattern);
  }

  async clearByAspectRatio(namespace: string, aspectRatio: AspectRatio): Promise<void> {
    const pattern = this.generateKey(namespace, '*', aspectRatio);
    await this.clearByPattern(pattern);
  }

  private async getByPattern<T>(pattern: string): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    if (this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        const values = await Promise.all(keys.map(key => this.get<T>(key)));
        
        keys.forEach((key, index) => {
          if (values[index] !== null) {
            results.set(key, values[index]!);
          }
        });
      } catch (error) {
        console.error('Error getting by pattern:', error);
      }
    }

    return results;
  }

  private async clearByPattern(pattern: string): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Error clearing by pattern:', error);
      }
    }

    // Clear from memory cache
    for (const [key] of this.memoryCache) {
      if (this.matchesPattern(key, pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  // Statistics and monitoring
  private recordHit(startTime: number): void {
    this.stats.hits++;
    this.recordResponseTime(startTime);
    this.updateHitRate();
  }

  private recordMiss(startTime: number): void {
    this.stats.misses++;
    this.recordResponseTime(startTime);
    this.updateHitRate();
  }

  private recordResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.responseTimes.push(responseTime);
    
    // Keep only last 1000 measurements
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    this.stats.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    this.stats.keyCount = this.memoryCache.size;
    this.stats.memoryUsage = this.calculateMemoryUsage();
    this.stats.lastUpdated = new Date().toISOString();
  }

  private calculateMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    for (const [key, entry] of this.memoryCache) {
      size += key.length + JSON.stringify(entry).length;
    }
    return size;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Periodic cleanup
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Cleanup every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache) {
      const expiryTime = new Date(entry.createdAt).getTime() + entry.ttl * 1000;
      if (now > expiryTime) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  // Shutdown
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

// Singleton instance
let cacheInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheInstance) {
    const config: Partial<CacheConfig> = {};
    
    // Configure Redis if environment variables are set
    if (process.env.REDIS_HOST) {
      config.redis = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      };
    }

    cacheInstance = new CacheManager(config);
  }
  
  return cacheInstance;
}

// Utility functions for specific cache operations
export async function cacheImage(key: string, imageData: string, aspectRatio: AspectRatio, ttl: number = 3600): Promise<void> {
  const cache = getCacheManager();
  const cacheKey = cache.generateImageKey(key, aspectRatio);
  await cache.set(cacheKey, imageData, ttl);
}

export async function getCachedImage(key: string, aspectRatio: AspectRatio): Promise<string | null> {
  const cache = getCacheManager();
  const cacheKey = cache.generateImageKey(key, aspectRatio);
  return cache.get<string>(cacheKey);
}

export async function cacheVideo(key: string, videoUrl: string, aspectRatio: AspectRatio, ttl: number = 7200): Promise<void> {
  const cache = getCacheManager();
  const cacheKey = cache.generateVideoKey(key, key, aspectRatio);
  await cache.set(cacheKey, videoUrl, ttl);
}

export async function getCachedVideo(key: string, aspectRatio: AspectRatio): Promise<string | null> {
  const cache = getCacheManager();
  const cacheKey = cache.generateVideoKey(key, key, aspectRatio);
  return cache.get<string>(cacheKey);
}