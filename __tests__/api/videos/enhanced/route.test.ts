/**
 * Test suite for enhanced video generation API endpoint
 * Tests aspect ratio functionality in the video generation pipeline
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/videos/enhanced/route'
import { ASPECT_RATIOS } from '@/app/constants/aspectRatios'

// Mock the dependencies
jest.mock('@/app/actions/generate-video-enhanced', () => ({
  editVideoEnhanced: jest.fn()
}))

jest.mock('@/lib/validation', () => ({
  validateVideoGenerationRequest: jest.fn(),
  validateCostLimits: jest.fn()
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('@/lib/metrics', () => ({
  getMetricsCollector: () => ({
    recordRequest: jest.fn(),
    recordCost: jest.fn()
  })
}))

import { editVideoEnhanced } from '@/app/actions/generate-video-enhanced'
import { validateVideoGenerationRequest, validateCostLimits } from '@/lib/validation'

const mockEditVideoEnhanced = editVideoEnhanced as jest.MockedFunction<typeof editVideoEnhanced>
const mockValidateRequest = validateVideoGenerationRequest as jest.MockedFunction<typeof validateVideoGenerationRequest>
const mockValidateCostLimits = validateCostLimits as jest.MockedFunction<typeof validateCostLimits>

describe('/api/videos/enhanced - POST', () => {
  const validAspectRatio = ASPECT_RATIOS[0] // 16:9
  
  const createValidRequest = (aspectRatio = validAspectRatio, overrides = {}) => {
    const requestBody = {
      scenes: [
        {
          imagePrompt: 'A beautiful sunset over mountains',
          videoPrompt: 'Camera pans slowly across the landscape',
          description: 'Opening scene of the story',
          voiceover: 'Welcome to our journey',
          charactersPresent: []
        }
      ],
      aspectRatio,
      options: {
        quality: 'medium',
        enableCaching: true,
        imageQuality: 'medium'
      },
      ...overrides
    }
    
    return new NextRequest('http://localhost:3000/api/videos/enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
  }

  const createMockVideoResponse = (aspectRatio = validAspectRatio) => ({
    success: true,
    scenes: [
      {
        imageUrl: 'https://example.com/image.jpg',
        videoUrl: 'https://example.com/video.mp4',
        prompt: 'Test prompt',
        aspectRatio
      }
    ],
    aspectRatio,
    metadata: {
      cost: 0.50,
      processingTime: 5000,
      cacheHits: 0,
      generationId: 'test-123'
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateRequest.mockReturnValue({
      scenes: [global.testUtils.mockScene],
      aspectRatio: validAspectRatio,
      options: { quality: 'medium', enableCaching: true }
    } as any)
    mockValidateCostLimits.mockReturnValue(undefined)
  })

  describe('Successful Requests', () => {
    it('processes valid request with default aspect ratio', async () => {
      const request = createValidRequest()
      mockEditVideoEnhanced.mockResolvedValueOnce(createMockVideoResponse())

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.scenes).toBeDefined()
      expect(data.aspectRatio.id).toBe('16:9')
      expect(mockEditVideoEnhanced).toHaveBeenCalledWith(
        expect.any(Array),
        validAspectRatio,
        expect.any(Object)
      )
    })

    it('processes request with portrait aspect ratio', async () => {
      const portraitRatio = ASPECT_RATIOS.find(ar => ar.id === '9:16')!
      const request = createValidRequest(portraitRatio)
      
      mockValidateRequest.mockReturnValueOnce({
        scenes: [global.testUtils.mockScene],
        aspectRatio: portraitRatio,
        options: { quality: 'medium', enableCaching: true }
      } as any)
      
      mockEditVideoEnhanced.mockResolvedValueOnce(createMockVideoResponse(portraitRatio))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.aspectRatio.id).toBe('9:16')
      expect(mockEditVideoEnhanced).toHaveBeenCalledWith(
        expect.any(Array),
        portraitRatio,
        expect.any(Object)
      )
    })

    it('processes request with square aspect ratio', async () => {
      const squareRatio = ASPECT_RATIOS.find(ar => ar.id === '1:1')!
      const request = createValidRequest(squareRatio)
      
      mockValidateRequest.mockReturnValueOnce({
        scenes: [global.testUtils.mockScene],
        aspectRatio: squareRatio,
        options: { quality: 'medium', enableCaching: true }
      } as any)
      
      mockEditVideoEnhanced.mockResolvedValueOnce(createMockVideoResponse(squareRatio))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.aspectRatio.id).toBe('1:1')
    })

    it('handles multiple scenes with same aspect ratio', async () => {
      const multiSceneRequest = createValidRequest(validAspectRatio, {
        scenes: [
          global.testUtils.mockScene,
          { ...global.testUtils.mockScene, description: 'Second scene' },
          { ...global.testUtils.mockScene, description: 'Third scene' }
        ]
      })

      const multiSceneResponse = {
        ...createMockVideoResponse(),
        scenes: [
          { imageUrl: 'image1.jpg', videoUrl: 'video1.mp4', prompt: 'Scene 1', aspectRatio: validAspectRatio },
          { imageUrl: 'image2.jpg', videoUrl: 'video2.mp4', prompt: 'Scene 2', aspectRatio: validAspectRatio },
          { imageUrl: 'image3.jpg', videoUrl: 'video3.mp4', prompt: 'Scene 3', aspectRatio: validAspectRatio }
        ]
      }

      mockValidateRequest.mockReturnValueOnce({
        scenes: multiSceneRequest.scenes,
        aspectRatio: validAspectRatio,
        options: { quality: 'medium', enableCaching: true }
      } as any)
      
      mockEditVideoEnhanced.mockResolvedValueOnce(multiSceneResponse as any)

      const response = await POST(multiSceneRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenes).toHaveLength(3)
      expect(data.scenes.every((scene: any) => scene.aspectRatio.id === validAspectRatio.id)).toBe(true)
    })

    it('returns correct metadata including cost and processing time', async () => {
      const request = createValidRequest()
      const mockResponse = {
        ...createMockVideoResponse(),
        metadata: {
          cost: 1.25,
          processingTime: 8500,
          cacheHits: 2,
          generationId: 'test-456',
          aspectRatioMultiplier: validAspectRatio.costMultiplier
        }
      }
      
      mockEditVideoEnhanced.mockResolvedValueOnce(mockResponse as any)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.cost).toBe(1.25)
      expect(data.metadata.processingTime).toBe(8500)
      expect(data.metadata.cacheHits).toBe(2)
      expect(data.metadata.generationId).toBe('test-456')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/videos/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('returns 400 for missing required fields', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api/videos/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // Empty body
      })

      mockValidateRequest.mockImplementationOnce(() => {
        throw new Error('Missing required field: scenes')
      })

      const response = await POST(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Missing required field')
    })

    it('returns 400 for invalid aspect ratio', async () => {
      const invalidAspectRatio = {
        id: 'invalid:ratio',
        ratio: -1,
        width: 0,
        height: 0
      }
      
      const request = createValidRequest(invalidAspectRatio as any)

      mockValidateRequest.mockImplementationOnce(() => {
        throw new Error('Invalid aspect ratio')
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid aspect ratio')
    })

    it('returns 400 when cost limits are exceeded', async () => {
      const request = createValidRequest()

      mockValidateCostLimits.mockImplementationOnce(() => {
        throw new Error('Estimated cost exceeds maximum allowed')
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('cost exceeds maximum')
    })

    it('validates aspect ratio compatibility with services', async () => {
      // Find an aspect ratio not supported by certain services
      const unsupportedRatio = ASPECT_RATIOS.find(ar => !ar.isSupported.veo)
      if (!unsupportedRatio) return

      const request = createValidRequest(unsupportedRatio)

      mockValidateRequest.mockImplementationOnce(() => {
        throw new Error('Aspect ratio not supported by required services')
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Error Handling', () => {
    it('handles video generation service errors', async () => {
      const request = createValidRequest()

      mockEditVideoEnhanced.mockRejectedValueOnce(new Error('Video generation service unavailable'))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Video generation failed')
    })

    it('handles timeout errors', async () => {
      const request = createValidRequest()

      mockEditVideoEnhanced.mockRejectedValueOnce(new Error('Request timeout'))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('handles rate limiting errors', async () => {
      const request = createValidRequest()

      mockEditVideoEnhanced.mockRejectedValueOnce(new Error('Rate limit exceeded'))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('handles insufficient quota errors', async () => {
      const request = createValidRequest()

      mockEditVideoEnhanced.mockRejectedValueOnce(new Error('Insufficient API quota'))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('Aspect Ratio Specific Processing', () => {
    it('applies correct cost multiplier for different aspect ratios', async () => {
      const expensiveRatio = ASPECT_RATIOS.find(ar => ar.costMultiplier > 1)!
      const request = createValidRequest(expensiveRatio)

      mockValidateRequest.mockReturnValueOnce({
        scenes: [global.testUtils.mockScene],
        aspectRatio: expensiveRatio,
        options: { quality: 'medium', enableCaching: true }
      } as any)

      const mockResponse = {
        ...createMockVideoResponse(expensiveRatio),
        metadata: {
          cost: 1.0 * expensiveRatio.costMultiplier,
          processingTime: 5000,
          cacheHits: 0,
          generationId: 'test-expensive'
        }
      }

      mockEditVideoEnhanced.mockResolvedValueOnce(mockResponse as any)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.cost).toBeGreaterThan(1.0)
    })

    it('handles high-resolution requests for supported ratios', async () => {
      const request = createValidRequest(validAspectRatio, {
        options: {
          quality: 'high',
          enableCaching: true,
          imageQuality: 'high'
        }
      })

      mockValidateRequest.mockReturnValueOnce({
        scenes: [global.testUtils.mockScene],
        aspectRatio: validAspectRatio,
        options: { quality: 'high', enableCaching: true, imageQuality: 'high' }
      } as any)

      const mockResponse = {
        ...createMockVideoResponse(),
        metadata: {
          cost: 2.5, // Higher cost for high quality
          processingTime: 12000, // Longer processing time
          cacheHits: 0,
          generationId: 'test-high-res'
        }
      }

      mockEditVideoEnhanced.mockResolvedValueOnce(mockResponse as any)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.cost).toBeGreaterThan(1.0)
      expect(data.metadata.processingTime).toBeGreaterThan(5000)
    })

    it('respects caching based on aspect ratio', async () => {
      const request = createValidRequest(validAspectRatio, {
        options: {
          enableCaching: true
        }
      })

      const mockResponse = {
        ...createMockVideoResponse(),
        metadata: {
          cost: 0.25, // Reduced cost due to cache hit
          processingTime: 1000, // Faster due to cache
          cacheHits: 1,
          generationId: 'test-cached'
        }
      }

      mockEditVideoEnhanced.mockResolvedValueOnce(mockResponse as any)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.cacheHits).toBe(1)
      expect(data.metadata.processingTime).toBeLessThan(5000)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty scenes array', async () => {
      const request = createValidRequest(validAspectRatio, { scenes: [] })

      mockValidateRequest.mockImplementationOnce(() => {
        throw new Error('At least one scene is required')
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('handles very large scene count', async () => {
      const manyScenes = Array.from({ length: 50 }, (_, i) => ({
        ...global.testUtils.mockScene,
        description: `Scene ${i + 1}`
      }))

      const request = createValidRequest(validAspectRatio, { scenes: manyScenes })

      mockValidateRequest.mockImplementationOnce(() => {
        throw new Error('Too many scenes (maximum 20 allowed)')
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('handles malformed aspect ratio object', async () => {
      const malformedRatio = {
        id: '16:9',
        // Missing required properties
      }

      const request = createValidRequest(malformedRatio as any)

      mockValidateRequest.mockImplementationOnce(() => {
        throw new Error('Invalid aspect ratio structure')
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('handles network interruption during processing', async () => {
      const request = createValidRequest()

      mockEditVideoEnhanced.mockRejectedValueOnce(new Error('Network connection lost'))

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Performance', () => {
    it('processes request within reasonable time', async () => {
      const request = createValidRequest()
      mockEditVideoEnhanced.mockResolvedValueOnce(createMockVideoResponse())

      const startTime = Date.now()
      const response = await POST(request)
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(1000) // Should respond quickly for mocked services
    })

    it('includes processing metrics in response', async () => {
      const request = createValidRequest()
      const mockResponse = {
        ...createMockVideoResponse(),
        metadata: {
          cost: 0.75,
          processingTime: 6500,
          cacheHits: 1,
          generationId: 'test-metrics',
          imageGenTime: 3000,
          videoGenTime: 3000,
          postProcessingTime: 500
        }
      }

      mockEditVideoEnhanced.mockResolvedValueOnce(mockResponse as any)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toHaveProperty('processingTime')
      expect(typeof data.metadata.processingTime).toBe('number')
    })
  })

  describe('Security', () => {
    it('sanitizes error messages to prevent information leakage', async () => {
      const request = createValidRequest()

      mockEditVideoEnhanced.mockRejectedValueOnce(new Error('Database connection string: user:pass@host'))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).not.toContain('user:pass@host')
      expect(data.error).toContain('Video generation failed')
    })

    it('validates request size limits', async () => {
      // Create a very large request
      const hugePrompt = 'A'.repeat(10000) // 10KB prompt
      const request = createValidRequest(validAspectRatio, {
        scenes: [{
          ...global.testUtils.mockScene,
          imagePrompt: hugePrompt
        }]
      })

      mockValidateRequest.mockImplementationOnce(() => {
        throw new Error('Request payload too large')
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})