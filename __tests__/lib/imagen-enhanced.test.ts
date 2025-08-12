/**
 * Test suite for enhanced Imagen service
 * Tests aspect ratio functionality in image generation
 */

import { generateImageRest } from '@/lib/imagen-enhanced'
import { ASPECT_RATIOS } from '@/app/constants/aspectRatios'

// Mock the dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('@/lib/cache', () => ({
  getCacheManager: () => ({
    generateImageKey: jest.fn((prompt, aspectRatio) => `image:${prompt}:${aspectRatio.id}`),
    get: jest.fn(),
    set: jest.fn(),
    getStats: () => ({ hits: 0, misses: 1, hitRate: 0 })
  })
}))

jest.mock('@/lib/metrics', () => ({
  getMetricsCollector: () => ({
    recordRequest: jest.fn(),
    recordCost: jest.fn()
  })
}))

// Mock Google Cloud Vertex AI
jest.mock('@google-cloud/aiplatform', () => ({
  PredictionServiceClient: jest.fn().mockImplementation(() => ({
    predict: jest.fn()
  })),
  helpers: {
    toValue: jest.fn()
  }
}))

// Mock the actual HTTP client for REST API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Imagen Enhanced Service', () => {
  const validPrompt = 'A beautiful mountain landscape at sunset'
  const validAspectRatio = ASPECT_RATIOS[0] // 16:9

  const createMockImageResponse = (aspectRatio = validAspectRatio) => ({
    predictions: [
      {
        bytesBase64Encoded: 'base64-encoded-image-data',
        mimeType: 'image/jpeg'
      }
    ],
    metadata: {
      cost: 0.05 * aspectRatio.costMultiplier,
      processingTime: 2500,
      aspectRatio
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Successful Image Generation', () => {
    it('generates image with default 16:9 aspect ratio', async () => {
      const mockResponse = createMockImageResponse()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result.success).toBe(true)
      expect(result.aspectRatio.id).toBe('16:9')
      expect(result.predictions).toHaveLength(1)
      expect(result.cost).toBeGreaterThan(0)
      expect(typeof result.processingTime).toBe('number')
    })

    it('generates image with portrait 9:16 aspect ratio', async () => {
      const portraitRatio = ASPECT_RATIOS.find(ar => ar.id === '9:16')!
      const mockResponse = createMockImageResponse(portraitRatio)
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, portraitRatio)

      expect(result.success).toBe(true)
      expect(result.aspectRatio.id).toBe('9:16')
      expect(result.aspectRatio.width).toBe(9)
      expect(result.aspectRatio.height).toBe(16)
    })

    it('generates image with square 1:1 aspect ratio', async () => {
      const squareRatio = ASPECT_RATIOS.find(ar => ar.id === '1:1')!
      const mockResponse = createMockImageResponse(squareRatio)
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, squareRatio)

      expect(result.success).toBe(true)
      expect(result.aspectRatio.id).toBe('1:1')
      expect(result.aspectRatio.ratio).toBe(1)
    })

    it('applies correct cost multiplier for different aspect ratios', async () => {
      // Find a ratio with cost multiplier different from 1.0
      const expensiveRatio = ASPECT_RATIOS.find(ar => ar.costMultiplier > 1.0)!
      const mockResponse = createMockImageResponse(expensiveRatio)
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, expensiveRatio)

      expect(result.success).toBe(true)
      expect(result.cost).toBeGreaterThan(0.05) // Base cost with multiplier applied
    })

    it('handles different quality levels with aspect ratios', async () => {
      const options = {
        quality: 'high' as const,
        enableCaching: false,
        retryAttempts: 1
      }

      const mockResponse = {
        ...createMockImageResponse(),
        metadata: {
          cost: 0.15, // Higher cost for high quality
          processingTime: 4000,
          aspectRatio: validAspectRatio
        }
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, validAspectRatio, options)

      expect(result.success).toBe(true)
      expect(result.cost).toBeGreaterThan(0.05) // Higher cost for high quality
      expect(result.processingTime).toBeGreaterThan(2500)
    })

    it('includes proper metadata in successful response', async () => {
      const mockResponse = createMockImageResponse()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('predictions')
      expect(result).toHaveProperty('aspectRatio')
      expect(result).toHaveProperty('cost')
      expect(result).toHaveProperty('processingTime')
      expect(result).toHaveProperty('cached')
      expect(result).toHaveProperty('generationId')
    })
  })

  describe('Aspect Ratio Validation', () => {
    it('rejects invalid aspect ratio', async () => {
      const invalidRatio = {
        id: 'invalid',
        ratio: -1,
        width: 0,
        height: 0
      }

      await expect(generateImageRest(validPrompt, invalidRatio as any))
        .rejects.toThrow('Invalid aspect ratio')
    })

    it('rejects aspect ratio not supported by Imagen', async () => {
      const unsupportedRatio = ASPECT_RATIOS.find(ar => !ar.isSupported.imagen)
      if (!unsupportedRatio) return // Skip if all ratios are supported

      await expect(generateImageRest(validPrompt, unsupportedRatio))
        .rejects.toThrow('Aspect ratio not supported by Imagen')
    })

    it('validates prompt length limits', async () => {
      const longPrompt = 'A'.repeat(2000) // Very long prompt
      
      await expect(generateImageRest(longPrompt, validAspectRatio))
        .rejects.toThrow('Prompt too long')
    })

    it('validates empty or whitespace-only prompts', async () => {
      await expect(generateImageRest('', validAspectRatio))
        .rejects.toThrow('Prompt cannot be empty')
      
      await expect(generateImageRest('   ', validAspectRatio))
        .rejects.toThrow('Prompt cannot be empty')
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('handles API rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' })
      })

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limit')
    })

    it('handles authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid credentials' })
      })

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication failed')
    })

    it('handles quota exceeded errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Quota exceeded' })
      })

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Quota exceeded')
    })

    it('handles malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ predictions: null }) // Invalid response structure
      })

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid response format')
    })

    it('handles timeout errors with retry logic', async () => {
      const options = { retryAttempts: 2, enableCaching: false }
      
      // First attempt fails with timeout
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))
      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockImageResponse()
      })

      const result = await generateImageRest(validPrompt, validAspectRatio, options)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial call + 1 retry
    })
  })

  describe('Caching Functionality', () => {
    it('returns cached result when available', async () => {
      const options = { enableCaching: true }
      const cachedResult = {
        ...createMockImageResponse(),
        cached: true,
        processingTime: 50 // Much faster due to cache
      }

      // Mock cache hit
      const mockCacheManager = require('@/lib/cache').getCacheManager()
      mockCacheManager.get.mockResolvedValueOnce(cachedResult)

      const result = await generateImageRest(validPrompt, validAspectRatio, options)

      expect(result.cached).toBe(true)
      expect(result.processingTime).toBeLessThan(100)
      expect(mockFetch).not.toHaveBeenCalled() // Should not call API
    })

    it('caches successful results for future use', async () => {
      const options = { enableCaching: true }
      const mockResponse = createMockImageResponse()
      
      // Mock cache miss
      const mockCacheManager = require('@/lib/cache').getCacheManager()
      mockCacheManager.get.mockResolvedValueOnce(null)
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, validAspectRatio, options)

      expect(result.success).toBe(true)
      expect(result.cached).toBe(false)
      expect(mockCacheManager.set).toHaveBeenCalled() // Should cache the result
    })

    it('generates unique cache keys for different aspect ratios', async () => {
      const options = { enableCaching: true }
      const mockCacheManager = require('@/lib/cache').getCacheManager()
      
      // Generate with 16:9
      mockCacheManager.get.mockResolvedValueOnce(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockImageResponse()
      })
      
      await generateImageRest(validPrompt, validAspectRatio, options)
      
      // Generate with 9:16
      const portraitRatio = ASPECT_RATIOS.find(ar => ar.id === '9:16')!
      mockCacheManager.get.mockResolvedValueOnce(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockImageResponse(portraitRatio)
      })
      
      await generateImageRest(validPrompt, portraitRatio, options)

      // Should generate different cache keys
      expect(mockCacheManager.generateImageKey).toHaveBeenCalledWith(validPrompt, validAspectRatio)
      expect(mockCacheManager.generateImageKey).toHaveBeenCalledWith(validPrompt, portraitRatio)
    })

    it('skips caching when disabled', async () => {
      const options = { enableCaching: false }
      const mockResponse = createMockImageResponse()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, validAspectRatio, options)

      const mockCacheManager = require('@/lib/cache').getCacheManager()
      expect(result.success).toBe(true)
      expect(mockCacheManager.get).not.toHaveBeenCalled()
      expect(mockCacheManager.set).not.toHaveBeenCalled()
    })
  })

  describe('Performance and Metrics', () => {
    it('records performance metrics', async () => {
      const mockResponse = createMockImageResponse()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await generateImageRest(validPrompt, validAspectRatio)

      const mockMetrics = require('@/lib/metrics').getMetricsCollector()
      expect(mockMetrics.recordRequest).toHaveBeenCalledWith(
        'imagen',
        true,
        expect.any(Number),
        validAspectRatio,
        expect.any(Number)
      )
    })

    it('records cost metrics with aspect ratio multiplier', async () => {
      const expensiveRatio = ASPECT_RATIOS.find(ar => ar.costMultiplier > 1.0)!
      const mockResponse = createMockImageResponse(expensiveRatio)
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await generateImageRest(validPrompt, expensiveRatio)

      const mockMetrics = require('@/lib/metrics').getMetricsCollector()
      expect(mockMetrics.recordCost).toHaveBeenCalledWith(
        'imagen',
        validPrompt,
        expect.any(Number),
        expensiveRatio.id
      )
    })

    it('measures processing time accurately', async () => {
      const mockResponse = createMockImageResponse()
      mockFetch.mockImplementationOnce(async () => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          ok: true,
          json: async () => mockResponse
        }
      })

      const startTime = Date.now()
      const result = await generateImageRest(validPrompt, validAspectRatio)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.processingTime).toBeGreaterThan(50)
      expect(result.processingTime).toBeLessThan(endTime - startTime + 50) // Allow some margin
    })
  })

  describe('Edge Cases', () => {
    it('handles prompts with special characters', async () => {
      const specialPrompt = 'A café with naïve people enjoying crème brûlée 🎨'
      const mockResponse = createMockImageResponse()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(specialPrompt, validAspectRatio)

      expect(result.success).toBe(true)
    })

    it('handles very high resolution requests', async () => {
      const options = {
        quality: 'high' as const,
        enableCaching: false
      }

      const mockResponse = {
        ...createMockImageResponse(),
        predictions: [{
          bytesBase64Encoded: 'high-res-image-data',
          mimeType: 'image/jpeg'
        }],
        metadata: {
          cost: 0.25,
          processingTime: 8000,
          aspectRatio: validAspectRatio
        }
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(validPrompt, validAspectRatio, options)

      expect(result.success).toBe(true)
      expect(result.cost).toBeGreaterThan(0.05) // Higher cost for high resolution
    })

    it('handles concurrent requests for different aspect ratios', async () => {
      const mockResponse16x9 = createMockImageResponse(ASPECT_RATIOS[0])
      const mockResponse9x16 = createMockImageResponse(ASPECT_RATIOS[1])
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse16x9
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse9x16
        })

      const [result1, result2] = await Promise.all([
        generateImageRest(validPrompt, ASPECT_RATIOS[0]),
        generateImageRest(validPrompt, ASPECT_RATIOS[1])
      ])

      expect(result1.success).toBe(true)
      expect(result1.aspectRatio.id).toBe(ASPECT_RATIOS[0].id)
      expect(result2.success).toBe(true)
      expect(result2.aspectRatio.id).toBe(ASPECT_RATIOS[1].id)
    })

    it('handles empty API response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          predictions: []
        })
      })

      const result = await generateImageRest(validPrompt, validAspectRatio)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No images generated')
    })
  })

  describe('Security', () => {
    it('sanitizes prompts to prevent injection attacks', async () => {
      const maliciousPrompt = '<script>alert("xss")</script> A landscape'
      const mockResponse = createMockImageResponse()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await generateImageRest(maliciousPrompt, validAspectRatio)

      expect(result.success).toBe(true)
      // Verify that the request was made with sanitized prompt
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.not.stringContaining('<script>')
        })
      )
    })

    it('validates aspect ratio object to prevent manipulation', async () => {
      const manipulatedRatio = {
        ...validAspectRatio,
        costMultiplier: -1000, // Attempt to manipulate cost
        id: '../../../etc/passwd' // Path traversal attempt
      }

      await expect(generateImageRest(validPrompt, manipulatedRatio as any))
        .rejects.toThrow()
    })
  })
})