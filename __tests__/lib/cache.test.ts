/**
 * Test suite for caching functionality
 * Tests aspect ratio-aware caching system
 */

import { getCacheManager } from '@/lib/cache'
import { ASPECT_RATIOS } from '@/app/constants/aspectRatios'

// Mock Redis/IORedis
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('redis_version:6.0.0'),
  }
  return jest.fn(() => mockRedis)
})

describe('Cache Manager', () => {
  let cacheManager: ReturnType<typeof getCacheManager>
  let mockRedis: any

  const validAspectRatio = ASPECT_RATIOS[0] // 16:9
  const testData = { test: 'data', timestamp: Date.now() }

  beforeEach(() => {
    jest.clearAllMocks()
    cacheManager = getCacheManager()
    // Get the mocked Redis instance
    mockRedis = require('ioredis')()
  })

  describe('Basic Operations', () => {
    it('sets and gets cache values', async () => {
      const key = 'test:key'
      const value = { data: 'test' }
      
      mockRedis.set.mockResolvedValueOnce('OK')
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value))
      
      await cacheManager.set(key, value, 3600)
      const result = await cacheManager.get(key)
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
        'EX',
        3600
      )
      expect(result).toEqual(value)
    })

    it('returns null for non-existent keys', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      
      const result = await cacheManager.get('non-existent')
      
      expect(result).toBeNull()
    })

    it('deletes cache values', async () => {
      const key = 'test:delete'
      
      mockRedis.del.mockResolvedValueOnce(1)
      
      await cacheManager.delete(key)
      
      expect(mockRedis.del).toHaveBeenCalledWith(key)
    })

    it('handles JSON serialization errors gracefully', async () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj // Circular reference
      
      await expect(cacheManager.set('circular', circularObj, 3600))
        .rejects.toThrow()
    })

    it('handles JSON deserialization errors gracefully', async () => {
      mockRedis.get.mockResolvedValueOnce('invalid json')
      
      const result = await cacheManager.get('invalid')
      
      expect(result).toBeNull() // Should return null on parse error
    })
  })

  describe('Aspect Ratio Key Generation', () => {
    it('generates image cache keys with aspect ratio', () => {
      const prompt = 'A beautiful landscape'
      const key = cacheManager.generateImageKey(prompt, validAspectRatio)
      
      expect(key).toContain('image')
      expect(key).toContain(validAspectRatio.id)
      expect(key).toContain('landscape') // Should include prompt hash/content
    })

    it('generates video cache keys with aspect ratio', () => {
      const prompt = 'Camera pans across mountains'
      const imageData = 'base64-image-data'
      const key = cacheManager.generateVideoKey(prompt, imageData, validAspectRatio)
      
      expect(key).toContain('video')
      expect(key).toContain(validAspectRatio.id)
    })

    it('generates scenario cache keys with aspect ratio', () => {
      const scenario = {
        pitch: 'A story about adventure',
        numScenes: 3,
        style: 'cinematic',
        language: { name: 'English', code: 'en' },
        aspectRatio: validAspectRatio
      }
      
      const key = cacheManager.generateScenarioKey(scenario)
      
      expect(key).toContain('scenario')
      expect(key).toContain(validAspectRatio.id)
      expect(key).toContain('adventure') // Should include pitch content
    })

    it('generates different keys for different aspect ratios', () => {
      const prompt = 'Same prompt for different ratios'
      
      const key16x9 = cacheManager.generateImageKey(prompt, ASPECT_RATIOS[0])
      const key9x16 = cacheManager.generateImageKey(prompt, ASPECT_RATIOS[1])
      
      expect(key16x9).not.toBe(key9x16)
      expect(key16x9).toContain('16:9')
      expect(key9x16).toContain('9:16')
    })

    it('generates consistent keys for same inputs', () => {
      const prompt = 'Consistent prompt'
      
      const key1 = cacheManager.generateImageKey(prompt, validAspectRatio)
      const key2 = cacheManager.generateImageKey(prompt, validAspectRatio)
      
      expect(key1).toBe(key2)
    })

    it('generates different keys for different prompts', () => {
      const key1 = cacheManager.generateImageKey('Prompt 1', validAspectRatio)
      const key2 = cacheManager.generateImageKey('Prompt 2', validAspectRatio)
      
      expect(key1).not.toBe(key2)
    })

    it('handles special characters in prompts', () => {
      const specialPrompt = 'A café with naïve people 🎨'
      
      expect(() => {
        cacheManager.generateImageKey(specialPrompt, validAspectRatio)
      }).not.toThrow()
    })

    it('handles very long prompts', () => {
      const longPrompt = 'A'.repeat(1000)
      
      const key = cacheManager.generateImageKey(longPrompt, validAspectRatio)
      
      expect(key.length).toBeLessThan(250) // Should be hashed/truncated
    })
  })

  describe('Cache Statistics', () => {
    it('tracks cache hits and misses', async () => {
      const key = 'stats:test'
      
      // Mock cache hit
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData))
      await cacheManager.get(key)
      
      // Mock cache miss
      mockRedis.get.mockResolvedValueOnce(null)
      await cacheManager.get('non-existent')
      
      const stats = cacheManager.getStats()
      
      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('hitRate')
      expect(typeof stats.hits).toBe('number')
      expect(typeof stats.misses).toBe('number')
      expect(typeof stats.hitRate).toBe('number')
    })

    it('calculates hit rate correctly', async () => {
      // Reset stats
      cacheManager = getCacheManager()
      
      const key = 'hitrate:test'
      
      // 3 hits
      mockRedis.get.mockResolvedValue(JSON.stringify(testData))
      await cacheManager.get(key)
      await cacheManager.get(key)
      await cacheManager.get(key)
      
      // 1 miss
      mockRedis.get.mockResolvedValueOnce(null)
      await cacheManager.get('miss-key')
      
      const stats = cacheManager.getStats()
      
      expect(stats.hits).toBe(3)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(75.0) // 3/4 = 75%
    })

    it('handles zero operations correctly', () => {
      const freshManager = getCacheManager()
      const stats = freshManager.getStats()
      
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.hitRate).toBe(0)
    })

    it('tracks key count', () => {
      const stats = cacheManager.getStats()
      
      expect(stats).toHaveProperty('keyCount')
      expect(typeof stats.keyCount).toBe('number')
    })
  })

  describe('Aspect Ratio Specific Caching', () => {
    it('caches images separately by aspect ratio', async () => {
      const prompt = 'Mountain landscape'
      const imageData = { url: 'image.jpg', data: 'base64' }
      
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.get.mockResolvedValue(JSON.stringify(imageData))
      
      // Cache same prompt with different aspect ratios
      await cacheManager.set(
        cacheManager.generateImageKey(prompt, ASPECT_RATIOS[0]),
        imageData,
        3600
      )
      
      await cacheManager.set(
        cacheManager.generateImageKey(prompt, ASPECT_RATIOS[1]),
        imageData,
        3600
      )
      
      expect(mockRedis.set).toHaveBeenCalledTimes(2)
      // Verify different keys were used
      const calls = mockRedis.set.mock.calls
      expect(calls[0][0]).not.toBe(calls[1][0])
    })

    it('retrieves cached images by specific aspect ratio', async () => {
      const prompt = 'City skyline'
      const ratio16x9 = ASPECT_RATIOS[0]
      const ratio9x16 = ASPECT_RATIOS[1]
      
      const imageData16x9 = { url: 'city-16x9.jpg', aspectRatio: ratio16x9 }
      const imageData9x16 = { url: 'city-9x16.jpg', aspectRatio: ratio9x16 }
      
      // Setup different responses for different keys
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('16:9')) {
          return Promise.resolve(JSON.stringify(imageData16x9))
        } else if (key.includes('9:16')) {
          return Promise.resolve(JSON.stringify(imageData9x16))
        }
        return Promise.resolve(null)
      })
      
      const result16x9 = await cacheManager.get(
        cacheManager.generateImageKey(prompt, ratio16x9)
      )
      
      const result9x16 = await cacheManager.get(
        cacheManager.generateImageKey(prompt, ratio9x16)
      )
      
      expect(result16x9?.url).toBe('city-16x9.jpg')
      expect(result9x16?.url).toBe('city-9x16.jpg')
    })

    it('caches video data with aspect ratio context', async () => {
      const videoPrompt = 'Camera movement'
      const imageData = 'base64-image'
      const aspectRatio = validAspectRatio
      
      const videoData = {
        url: 'video.mp4',
        aspectRatio,
        duration: 5000
      }
      
      mockRedis.set.mockResolvedValue('OK')
      
      const videoKey = cacheManager.generateVideoKey(videoPrompt, imageData, aspectRatio)
      await cacheManager.set(videoKey, videoData, 7200)
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        videoKey,
        JSON.stringify(videoData),
        'EX',
        7200
      )
    })

    it('invalidates cache by aspect ratio pattern', async () => {
      const aspectRatioId = validAspectRatio.id
      const pattern = `*:${aspectRatioId}:*`
      
      mockRedis.keys.mockResolvedValueOnce([
        `image:prompt1:${aspectRatioId}:hash1`,
        `video:prompt2:${aspectRatioId}:hash2`,
        `scenario:story1:${aspectRatioId}:hash3`
      ])
      
      mockRedis.del.mockResolvedValue(3)
      
      await cacheManager.invalidateByPattern(pattern)
      
      expect(mockRedis.keys).toHaveBeenCalledWith(pattern)
      expect(mockRedis.del).toHaveBeenCalledWith([
        `image:prompt1:${aspectRatioId}:hash1`,
        `video:prompt2:${aspectRatioId}:hash2`,
        `scenario:story1:${aspectRatioId}:hash3`
      ])
    })
  })

  describe('Cache Expiration', () => {
    it('sets appropriate TTL for different content types', async () => {
      mockRedis.set.mockResolvedValue('OK')
      
      // Image cache - longer TTL
      await cacheManager.set('image:test', testData, 86400) // 24 hours
      expect(mockRedis.set).toHaveBeenCalledWith(
        'image:test',
        JSON.stringify(testData),
        'EX',
        86400
      )
      
      // Video cache - shorter TTL  
      await cacheManager.set('video:test', testData, 3600) // 1 hour
      expect(mockRedis.set).toHaveBeenCalledWith(
        'video:test',
        JSON.stringify(testData),
        'EX',
        3600
      )
    })

    it('handles cache expiration gracefully', async () => {
      mockRedis.get.mockResolvedValueOnce(null) // Expired/non-existent
      
      const result = await cacheManager.get('expired:key')
      
      expect(result).toBeNull()
    })
  })

  describe('Performance', () => {
    it('performs cache operations quickly', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(testData))
      mockRedis.set.mockResolvedValue('OK')
      
      const startTime = performance.now()
      
      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        await cacheManager.get(`key${i}`)
        await cacheManager.set(`key${i}`, testData, 3600)
      }
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should be fast for mocked operations
    })

    it('handles concurrent cache operations', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(testData))
      mockRedis.set.mockResolvedValue('OK')
      
      const operations = []
      for (let i = 0; i < 10; i++) {
        operations.push(cacheManager.get(`concurrent:${i}`))
        operations.push(cacheManager.set(`concurrent:${i}`, testData, 3600))
      }
      
      await expect(Promise.all(operations)).resolves.toBeDefined()
    })

    it('optimizes key generation performance', () => {
      const prompt = 'Performance test prompt'
      
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        cacheManager.generateImageKey(prompt, validAspectRatio)
      }
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Key generation should be very fast
    })
  })

  describe('Error Handling', () => {
    it('handles Redis connection errors', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Connection failed'))
      
      // Should not throw, should return null or handle gracefully
      const result = await cacheManager.get('test:error')
      
      expect(result).toBeNull()
    })

    it('handles Redis write errors', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('Write failed'))
      
      // Should not throw
      await expect(cacheManager.set('error:key', testData, 3600))
        .resolves.not.toThrow()
    })

    it('handles malformed cache data', async () => {
      mockRedis.get.mockResolvedValueOnce('{"malformed": json}') // Invalid JSON
      
      const result = await cacheManager.get('malformed')
      
      expect(result).toBeNull()
    })

    it('handles very large cache values', async () => {
      const largeData = {
        data: 'A'.repeat(100000), // 100KB string
        metadata: { size: 'large' }
      }
      
      mockRedis.set.mockResolvedValue('OK')
      
      await expect(cacheManager.set('large:data', largeData, 3600))
        .resolves.not.toThrow()
    })
  })

  describe('Memory Management', () => {
    it('provides memory usage information', () => {
      const stats = cacheManager.getStats()
      
      expect(stats).toHaveProperty('keyCount')
      expect(typeof stats.keyCount).toBe('number')
    })

    it('handles cache cleanup operations', async () => {
      mockRedis.keys.mockResolvedValue(['old:key1', 'old:key2', 'old:key3'])
      mockRedis.del.mockResolvedValue(3)
      
      await cacheManager.cleanup()
      
      expect(mockRedis.del).toHaveBeenCalled()
    })
  })

  describe('Integration with Aspect Ratio System', () => {
    it('maintains separate cache namespaces for each aspect ratio', async () => {
      const prompt = 'Integration test prompt'
      
      ASPECT_RATIOS.slice(0, 3).forEach(aspectRatio => {
        const key = cacheManager.generateImageKey(prompt, aspectRatio)
        expect(key).toContain(aspectRatio.id)
        
        // Verify keys are unique
        ASPECT_RATIOS.slice(0, 3).forEach(otherRatio => {
          if (aspectRatio.id !== otherRatio.id) {
            const otherKey = cacheManager.generateImageKey(prompt, otherRatio)
            expect(key).not.toBe(otherKey)
          }
        })
      })
    })

    it('supports cache invalidation by aspect ratio', async () => {
      const targetRatio = validAspectRatio
      const pattern = `*:${targetRatio.id}:*`
      
      mockRedis.keys.mockResolvedValueOnce([
        `image:test1:${targetRatio.id}:hash1`,
        `video:test2:${targetRatio.id}:hash2`
      ])
      
      mockRedis.del.mockResolvedValue(2)
      
      await cacheManager.invalidateByAspectRatio(targetRatio.id)
      
      expect(mockRedis.keys).toHaveBeenCalledWith(pattern)
      expect(mockRedis.del).toHaveBeenCalled()
    })
  })
})