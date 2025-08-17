import { logger } from '@/lib/logger'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  contentType: string
  accessCount: number
  lastAccessed: number
  metadata?: Record<string, any>
}

export interface CacheStats {
  totalEntries: number
  hitRate: number
  missRate: number
  evictions: number
  averageAccessCount: number
}

export class IntelligentCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 1000
  private hits = 0
  private misses = 0
  private evictions = 0
  
  // Different TTLs for different content types (in milliseconds)
  private ttlConfig = {
    shorts: 15 * 60 * 1000,      // 15 minutes - Shorts content changes rapidly
    video: 60 * 60 * 1000,       // 1 hour - Regular videos are more stable
    metadata: 30 * 60 * 1000,    // 30 minutes - Metadata moderate stability
    fallback: 5 * 60 * 1000,     // 5 minutes - Fallback results short cache
    error: 60 * 1000             // 1 minute - Error results very short cache
  }

  set<T>(
    key: string,
    data: T,
    contentType: string,
    metadata?: Record<string, any>
  ): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }
    
    const ttl = this.ttlConfig[contentType as keyof typeof this.ttlConfig] || this.ttlConfig.metadata
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      contentType,
      accessCount: 0,
      lastAccessed: Date.now(),
      metadata
    })
    
    logger.debug(`Cache set: ${key} (type: ${contentType}, ttl: ${ttl}ms)`)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.misses++
      return null
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.misses++
      logger.debug(`Cache expired: ${key}`)
      return null
    }
    
    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.hits++
    
    logger.debug(`Cache hit: ${key} (access count: ${entry.accessCount})`)
    return entry.data
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) return false
    
    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    this.evictions = 0
    logger.info('Cache cleared')
  }

  // Evict least recently used entries
  private evictLRU(): void {
    let oldestTime = Date.now()
    let oldestKey: string | null = null
    
    // Find the least recently accessed entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.evictions++
      logger.debug(`Cache evicted LRU: ${oldestKey}`)
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses
    const entries = Array.from(this.cache.values())
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.misses / totalRequests) * 100 : 0,
      evictions: this.evictions,
      averageAccessCount: entries.length > 0
        ? entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length
        : 0
    }
  }

  // Get entries by content type
  getEntriesByType(contentType: string): number {
    let count = 0
    for (const entry of this.cache.values()) {
      if (entry.contentType === contentType) count++
    }
    return count
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cache cleanup: removed ${cleaned} expired entries`)
    }
    
    return cleaned
  }

  // Generate cache key for YouTube content
  static generateKey(type: string, ...params: string[]): string {
    return `${type}:${params.join(':')}`
  }

  // Create specialized cache keys
  static createYouTubeKey(videoId: string, variant?: string): string {
    return variant ? `youtube:${videoId}:${variant}` : `youtube:${videoId}`
  }

  static createShortsKey(videoId: string, analysisType?: string): string {
    return analysisType ? `shorts:${videoId}:${analysisType}` : `shorts:${videoId}`
  }

  // Batch operations
  async getBatch<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>()
    
    for (const key of keys) {
      results.set(key, this.get<T>(key))
    }
    
    return results
  }

  setBatch<T>(entries: Array<{ key: string; data: T; contentType: string }>): void {
    for (const { key, data, contentType } of entries) {
      this.set(key, data, contentType)
    }
  }
}

// Singleton instance with periodic cleanup
export const intelligentCache = new IntelligentCache()

// Set up periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    intelligentCache.cleanup()
  }, 5 * 60 * 1000)
}

// Export types
export type { CacheEntry, CacheStats }